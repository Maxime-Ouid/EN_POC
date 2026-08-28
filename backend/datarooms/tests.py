import unittest
from binascii import unhexlify

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connections
from django.test import Client, RequestFactory, TestCase
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

from .models import AccessRestriction, Dataroom, Document, Folder, Office, OfficeMembership
from .tenancy.context import get_current_tenant, reset_current_tenant, set_current_tenant, TenantContext
from .tenancy.middleware import TenantResolutionMiddleware
from .tenancy.registry import ensure_tenant_registered, tenant_alias, tenant_db_path
from .tenancy.router import TenantRouter
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import is_accepted_extension

User = get_user_model()
TEST_TOTP_KEY = "3a" * 20  # 40 caractères hex (20 octets) — clé de test arbitraire mais valide


def valid_code_for(hex_key):
    return f"{totp(unhexlify(hex_key)):06d}"


class TenantContextTests(TestCase):
    def test_set_get_reset_roundtrip(self):
        self.assertIsNone(get_current_tenant())
        token = set_current_tenant(TenantContext(subdomain="officea", alias="tenant_officea"))
        self.assertEqual(get_current_tenant().subdomain, "officea")
        reset_current_tenant(token)
        self.assertIsNone(get_current_tenant())


class TenantRegistryTests(TestCase):
    def test_alias_and_path_are_lowercased(self):
        self.assertEqual(tenant_alias("OfficeA"), "tenant_officea")
        self.assertEqual(tenant_db_path("OfficeA"), settings.TENANT_DB_DIR / "officea.sqlite3")


class TenantRouterTests(TestCase):
    def setUp(self):
        self.router = TenantRouter()

    def test_shared_model_only_migrates_on_default(self):
        self.assertTrue(self.router.allow_migrate("default", "datarooms", "office"))
        self.assertFalse(self.router.allow_migrate("tenant_officea", "datarooms", "office"))

    def test_office_enabled_modules_m2m_through_table_is_shared(self):
        # Régression : la table M2M implicite d'Office.enabled_modules doit rester
        # partagée comme Office/Module. Sinon, modifier les modules activés d'un office
        # échoue dès que la requête arrive via un vrai sous-domaine (ex: /admin/ sur
        # officea.localhost:8000) car le ContextVar de tenant est alors résolu et le
        # routeur tente d'écrire dans une base tenant sans table métier.
        self.assertTrue(self.router.allow_migrate("default", "datarooms", "office_enabled_modules"))
        self.assertFalse(self.router.allow_migrate("tenant_officea", "datarooms", "office_enabled_modules"))

    def test_dataroom_is_a_tenant_model_not_shared(self):
        # Dataroom est le premier modèle métier tenant : absent de SHARED_MODELS par
        # conception, il doit migrer sur les bases tenant et jamais sur default.
        self.assertFalse(self.router.allow_migrate("default", "datarooms", "dataroom"))
        self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", "dataroom"))

    def test_document_is_a_tenant_model_not_shared(self):
        # Document vit dans la même base tenant que Dataroom (FK classique intra-DB) —
        # doit lui aussi migrer sur tenant et jamais sur default.
        self.assertFalse(self.router.allow_migrate("default", "datarooms", "document"))
        self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", "document"))

    def test_folder_is_a_tenant_model_not_shared(self):
        # Même patron que Dataroom/Document : Folder vit dans la base tenant, doit
        # migrer là et jamais sur default.
        self.assertFalse(self.router.allow_migrate("default", "datarooms", "folder"))
        self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", "folder"))

    def test_access_restriction_is_a_tenant_model_not_shared(self):
        # Même patron que Dataroom/Document/Folder : AccessRestriction vit dans la base
        # tenant, doit migrer là et jamais sur default.
        self.assertFalse(self.router.allow_migrate("default", "datarooms", "accessrestriction"))
        self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", "accessrestriction"))

    def test_non_datarooms_apps_are_treated_as_shared(self):
        self.assertTrue(self.router.allow_migrate("default", "auth", "user"))
        self.assertFalse(self.router.allow_migrate("tenant_officea", "auth", "user"))

    def test_otp_totp_app_is_shared(self):
        # Régression : TOTPDevice a une FK vers User (base default). Sans "otp_totp"
        # dans SHARED_APPS, allow_migrate bloque sa table aussi bien sur default que
        # sur tenant (MissingTenantContext sur un migrate nu) — même piège que
        # office_enabled_modules.
        self.assertTrue(self.router.allow_migrate("default", "otp_totp", "totpdevice"))
        self.assertFalse(self.router.allow_migrate("tenant_officea", "otp_totp", "totpdevice"))


class ExtensionValidatorTests(TestCase):
    def test_accepts_known_extensions_case_insensitively(self):
        self.assertTrue(is_accepted_extension("contrat.pdf"))
        self.assertTrue(is_accepted_extension("contrat.PDF"))
        self.assertTrue(is_accepted_extension("rapport.docx"))

    def test_rejects_unknown_or_missing_extension(self):
        self.assertFalse(is_accepted_extension("virus.exe"))
        self.assertFalse(is_accepted_extension("sans_extension"))


class TenantResolutionMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.office = Office.objects.create(subdomain="officea", name="Office A")

    def test_resolves_and_resets_tenant_for_known_subdomain(self):
        # ensure_tenant_registered mutates the process-global connections.databases
        # dict — undo that after the test so Django's SimpleTestCase database-failure
        # cleanup (which snapshots known aliases at setUpClass) doesn't trip over an
        # alias that appeared mid-class-lifetime.
        self.addCleanup(connections.databases.pop, tenant_alias("officea"), None)

        seen = {}

        def get_response(request):
            seen["tenant"] = get_current_tenant()
            seen["office"] = request.office
            return "ok"

        middleware = TenantResolutionMiddleware(get_response)
        request = self.factory.get("/api/tenant-config/", HTTP_HOST="officea.localhost:8000")

        middleware(request)

        self.assertEqual(seen["tenant"].subdomain, "officea")
        self.assertEqual(seen["tenant"].alias, "tenant_officea")
        self.assertEqual(seen["office"], self.office)
        self.assertIsNone(get_current_tenant())

    def test_unknown_subdomain_leaves_tenant_unresolved(self):
        seen = {}

        def get_response(request):
            seen["tenant"] = get_current_tenant()
            seen["office"] = request.office
            return "ok"

        middleware = TenantResolutionMiddleware(get_response)
        request = self.factory.get("/api/tenant-config/", HTTP_HOST="inconnu.localhost:8000")

        middleware(request)

        self.assertIsNone(seen["tenant"])
        self.assertIsNone(seen["office"])
        self.assertIsNone(get_current_tenant())

    def test_bare_localhost_has_no_subdomain(self):
        seen = {}

        def get_response(request):
            seen["office"] = request.office
            return "ok"

        middleware = TenantResolutionMiddleware(get_response)
        request = self.factory.get("/api/ping/", HTTP_HOST="localhost:8000")

        middleware(request)

        self.assertIsNone(seen["office"])


class SsoTicketTests(TestCase):
    # _consumed_tickets est un set module-global : deux tickets émis pour le même
    # (user_id, target) dans la même seconde produisent la même chaîne signée
    # (TimestampSigner tronque à la seconde). Chaque test utilise donc un couple
    # (user_id, target) distinct pour ne pas se marcher dessus.

    def test_roundtrip(self):
        ticket = issue_ticket(user_id=42, target_subdomain="officeb")
        payload = consume_ticket(ticket)
        self.assertEqual(payload, {"user_id": 42, "target": "officeb"})

    def test_ticket_is_single_use(self):
        ticket = issue_ticket(user_id=43, target_subdomain="officeb")
        self.assertIsNotNone(consume_ticket(ticket))
        self.assertIsNone(consume_ticket(ticket))

    def test_garbage_ticket_rejected(self):
        self.assertIsNone(consume_ticket("n'importe quoi"))


class MfaLoginFlowTests(TestCase):
    # Le flux MFA ne touche jamais request.office (login_view est office-agnostique),
    # donc testable avec le Client Django normal — pas la limite déjà documentée sur
    # les alias tenant enregistrés paresseusement.

    def setUp(self):
        self.user = User.objects.create_user(username="enrollee", password="pw123456")

    def _login(self):
        return self.client.post(
            "/api/login/",
            {"username": "enrollee", "password": "pw123456"},
            content_type="application/json",
        )

    def test_login_without_device_requires_enrollment(self):
        res = self._login()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"mfa_required": True, "enrollment": True})
        # Mot de passe correct mais MFA pas passée : aucune session ouverte.
        self.assertEqual(self.client.get("/api/whoami/").status_code, 403)

    def test_enrollment_flow(self):
        self._login()

        setup = self.client.get("/api/mfa/setup/")
        self.assertEqual(setup.status_code, 200)
        secret = setup.json()["secret"]
        self.assertIn("qr_code", setup.json())

        bad = self.client.post("/api/mfa/setup/", {"token": "000000"}, content_type="application/json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.client.get("/api/whoami/").status_code, 403)

        # Un échec active le throttling anti-bruteforce intégré de django-otp (délai
        # exponentiel avant la prochaine tentative, indépendant de la validité du code
        # suivant — verify_is_allowed() court-circuite verify_token() avant même de
        # regarder le code). On le lève explicitement ici plutôt que d'attendre en
        # vrai dans la suite de tests.
        TOTPDevice.objects.filter(user=self.user, confirmed=False).update(
            throttling_failure_count=0, throttling_failure_timestamp=None
        )

        good = self.client.post(
            "/api/mfa/setup/", {"token": valid_code_for(secret)}, content_type="application/json"
        )
        self.assertEqual(good.status_code, 200)
        self.assertEqual(good.json(), {"username": "enrollee"})
        self.assertEqual(self.client.get("/api/whoami/").status_code, 200)

    def test_verify_flow_for_existing_device(self):
        device = TOTPDevice.objects.create(user=self.user, name="d", key=TEST_TOTP_KEY, confirmed=True)
        res = self._login()
        self.assertEqual(res.json(), {"mfa_required": True, "enrollment": False})

        bad = self.client.post("/api/mfa/verify/", {"token": "000000"}, content_type="application/json")
        self.assertEqual(bad.status_code, 400)

        device.throttle_reset()  # voir commentaire équivalent dans test_enrollment_flow

        good = self.client.post(
            "/api/mfa/verify/", {"token": valid_code_for(TEST_TOTP_KEY)}, content_type="application/json"
        )
        self.assertEqual(good.status_code, 200)
        self.assertEqual(self.client.get("/api/whoami/").status_code, 200)

    def test_sso_ticket_consumption_never_triggers_mfa(self):
        # Point critique explicitement demandé : même avec un dispositif confirmé, la
        # bascule d'office par ticket SSO ne doit jamais passer par /api/mfa/*.
        # ensure_tenant_registered (déclenché par le Host officex.localhost) mute le
        # dict global connections.databases — même piège déjà documenté ailleurs pour
        # SimpleTestCase, on le retire en fin de test.
        self.addCleanup(connections.databases.pop, tenant_alias("officex"), None)

        TOTPDevice.objects.create(user=self.user, name="d", key=TEST_TOTP_KEY, confirmed=True)
        Office.objects.create(subdomain="officex", name="Office X")

        ticket = issue_ticket(self.user.id, "officex")
        res = self.client.get(f"/api/sso/consume/?ticket={ticket}", HTTP_HOST="officex.localhost:8000")
        self.assertEqual(res.status_code, 302)

        # La session est déjà pleinement ouverte, sans étape MFA intermédiaire.
        whoami = self.client.get("/api/whoami/", HTTP_HOST="officex.localhost:8000")
        self.assertEqual(whoami.status_code, 200)
        self.assertEqual(whoami.json(), {"username": "enrollee"})


class OfficeUsersApiTests(TestCase):
    # Office/OfficeMembership/User vivent tous dans la base default (registre
    # transverse), donc testables directement contrairement à l'isolation physique de
    # Dataroom/Document/Folder. Le Host résolu déclenche quand même
    # ensure_tenant_registered (TenantResolutionMiddleware le fait pour tout Host
    # connu, indépendamment des modèles réellement touchés par la vue) — même piège
    # connections.databases que MfaLoginFlowTests.test_sso_ticket_consumption_...

    def setUp(self):
        self.office_x = Office.objects.create(subdomain="userofficex", name="Office X")
        self.office_y = Office.objects.create(subdomain="userofficey", name="Office Y")
        self.addCleanup(connections.databases.pop, tenant_alias("userofficex"), None)
        self.addCleanup(connections.databases.pop, tenant_alias("userofficey"), None)

        self.admin_x = User.objects.create_user(username="admin_x", password="pw123456")
        OfficeMembership.objects.create(user=self.admin_x, office=self.office_x, role="admin")

        self.membre_x = User.objects.create_user(username="membre_x", password="pw123456")
        OfficeMembership.objects.create(user=self.membre_x, office=self.office_x, role="membre")

        # Identité partagée façon carla : superadmin sur les deux offices à la fois.
        self.shared_super = User.objects.create_user(username="shared_super", password="pw123456")
        OfficeMembership.objects.create(user=self.shared_super, office=self.office_x, role="superadmin")
        self.membership_y = OfficeMembership.objects.create(
            user=self.shared_super, office=self.office_y, role="superadmin"
        )

    def test_non_manager_cannot_list_or_create(self):
        self.client.force_login(self.membre_x)
        res = self.client.get("/api/office-users/", HTTP_HOST="userofficex.localhost:8000")
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            "/api/office-users/",
            {"username": "nope", "password": "S3curePassw0rd!", "role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(User.objects.filter(username="nope").exists())

    def test_manager_can_list_and_create(self):
        self.client.force_login(self.admin_x)
        res = self.client.get("/api/office-users/", HTTP_HOST="userofficex.localhost:8000")
        self.assertEqual(res.status_code, 200)
        # admin_x est "admin" (pas superadmin) : shared_super (superadmin sur office_x)
        # est masqué — voir test_admin_cannot_see_superadmin_in_list pour la régression
        # dédiée à cette règle.
        usernames = {row["username"] for row in res.json()}
        self.assertEqual(usernames, {"admin_x", "membre_x"})

        res = self.client.post(
            "/api/office-users/",
            {"username": "nouvel_utilisateur", "password": "S3curePassw0rd!", "role": "client"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(User.objects.filter(username="nouvel_utilisateur").exists())
        self.assertTrue(
            OfficeMembership.objects.filter(
                user__username="nouvel_utilisateur", office=self.office_x, role="client"
            ).exists()
        )

    def test_duplicate_username_rejected(self):
        self.client.force_login(self.admin_x)
        res = self.client.post(
            "/api/office-users/",
            {"username": "membre_x", "password": "S3curePassw0rd!", "role": "client"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)

    def test_weak_password_rejected(self):
        # Réutilise AUTH_PASSWORD_VALIDATORS déjà configuré (settings.py) plutôt que
        # de réinventer une règle de robustesse propre à cet endpoint.
        self.client.force_login(self.admin_x)
        res = self.client.post(
            "/api/office-users/",
            {"username": "someone_new", "password": "1234", "role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(username="someone_new").exists())

    def test_manager_can_update_role_within_own_office(self):
        self.client.force_login(self.admin_x)
        membership = OfficeMembership.objects.get(user=self.membre_x, office=self.office_x)
        res = self.client.patch(
            f"/api/office-users/{membership.id}/",
            {"role": "admin"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 200)
        membership.refresh_from_db()
        self.assertEqual(membership.role, "admin")

    def test_manager_cannot_reach_membership_of_another_office(self):
        # Régression critique explicitement demandée : un admin de officex ne doit
        # jamais pouvoir modifier les utilisateurs de officey, même via un
        # membership_id valide appartenant à un utilisateur (shared_super) qui a par
        # ailleurs aussi accès à officex.
        self.client.force_login(self.admin_x)
        res = self.client.patch(
            f"/api/office-users/{self.membership_y.id}/",
            {"role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 404)
        self.membership_y.refresh_from_db()
        self.assertEqual(self.membership_y.role, "superadmin")

    def test_office_list_excludes_other_office_memberships(self):
        # shared_super a un accès superadmin sur officex ET officey — la liste vue
        # depuis officex ne doit exposer que sa ligne officex, pas sa ligne officey.
        self.client.force_login(self.admin_x)
        res = self.client.get("/api/office-users/", HTTP_HOST="userofficex.localhost:8000")
        membership_ids = {row["membership_id"] for row in res.json()}
        self.assertNotIn(self.membership_y.id, membership_ids)

    # --- Visibilité hiérarchique des rôles (un admin ne voit/gère jamais un superadmin) ---

    def test_admin_cannot_see_superadmin_in_list(self):
        self.client.force_login(self.admin_x)
        res = self.client.get("/api/office-users/", HTTP_HOST="userofficex.localhost:8000")
        usernames = {row["username"] for row in res.json()}
        self.assertNotIn("shared_super", usernames)

    def test_admin_gets_404_patching_superadmin_membership(self):
        # Même office (contrairement à test_manager_cannot_reach_membership_of_another_
        # office) : shared_super est bien superadmin SUR office_x, l'office d'admin_x —
        # c'est uniquement le rang du rôle qui doit provoquer le 404, pas l'office.
        self.client.force_login(self.admin_x)
        membership = OfficeMembership.objects.get(user=self.shared_super, office=self.office_x)
        res = self.client.patch(
            f"/api/office-users/{membership.id}/",
            {"role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 404)
        membership.refresh_from_db()
        self.assertEqual(membership.role, "superadmin")

    def test_admin_cannot_create_or_attach_as_superadmin(self):
        self.client.force_login(self.admin_x)

        res = self.client.post(
            "/api/office-users/",
            {"username": "wannabe_super", "password": "S3curePassw0rd!", "role": "superadmin"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(username="wannabe_super").exists())

        outsider = User.objects.create_user(username="outsider", password="pw123456")
        res = self.client.post(
            "/api/office-users/attach/",
            {"username": "outsider", "role": "superadmin"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(OfficeMembership.objects.filter(user=outsider, office=self.office_x).exists())

    def test_admin_cannot_promote_existing_member_to_superadmin(self):
        # Cohérence explicitement demandée : la même règle de rang s'applique aussi au
        # PATCH d'un membership qu'admin_x peut par ailleurs voir/gérer (pas seulement
        # à la création) — sinon un admin pourrait contourner l'interdiction de créer
        # un superadmin en promouvant un membre existant à la place.
        self.client.force_login(self.admin_x)
        membership = OfficeMembership.objects.get(user=self.membre_x, office=self.office_x)
        res = self.client.patch(
            f"/api/office-users/{membership.id}/",
            {"role": "superadmin"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)
        membership.refresh_from_db()
        self.assertEqual(membership.role, "membre")

    def test_superadmin_sees_and_manages_superadmin_rows(self):
        # Un superadmin, contrairement à un admin, voit tout le monde y compris les
        # autres superadmin de son office (et lui-même).
        self.client.force_login(self.shared_super)
        res = self.client.get("/api/office-users/", HTTP_HOST="userofficex.localhost:8000")
        usernames = {row["username"] for row in res.json()}
        self.assertEqual(usernames, {"admin_x", "membre_x", "shared_super"})

        admin_membership = OfficeMembership.objects.get(user=self.admin_x, office=self.office_x)
        res = self.client.patch(
            f"/api/office-users/{admin_membership.id}/",
            {"role": "superadmin"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 200)
        admin_membership.refresh_from_db()
        self.assertEqual(admin_membership.role, "superadmin")

    # --- Rattachement d'un utilisateur existant ---

    def test_attach_unknown_username_returns_generic_error(self):
        self.client.force_login(self.admin_x)
        res = self.client.post(
            "/api/office-users/attach/",
            {"username": "does_not_exist_anywhere", "role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json(), {"error": "utilisateur introuvable"})

    def test_attach_already_member_rejected(self):
        self.client.force_login(self.admin_x)
        res = self.client.post(
            "/api/office-users/attach/",
            {"username": "membre_x", "role": "membre"},
            content_type="application/json",
            HTTP_HOST="userofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 400)

    def test_attach_existing_superadmin_to_second_office(self):
        # Scénario positif explicitement demandé : un utilisateur superadmin existant
        # sur un premier office (type carla) est rattaché à un second office par
        # l'admin (ici superadmin, car le rôle rattaché est superadmin — voir
        # test_admin_cannot_create_or_attach_as_superadmin) de ce second office —
        # recherche par nom exact, pas de création de compte.
        carla_like = User.objects.create_user(username="carla_like", password="pw123456")
        OfficeMembership.objects.create(user=carla_like, office=self.office_x, role="superadmin")

        super_y = User.objects.create_user(username="super_y", password="pw123456")
        OfficeMembership.objects.create(user=super_y, office=self.office_y, role="superadmin")

        self.client.force_login(super_y)
        res = self.client.post(
            "/api/office-users/attach/",
            {"username": "carla_like", "role": "superadmin"},
            content_type="application/json",
            HTTP_HOST="userofficey.localhost:8000",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(
            OfficeMembership.objects.filter(
                user=carla_like, office=self.office_y, role="superadmin"
            ).exists()
        )
        # Toujours superadmin sur office_x également — identité partagée intacte, pas
        # de duplication de compte ni de perte de l'accès existant.
        self.assertTrue(
            OfficeMembership.objects.filter(
                user=carla_like, office=self.office_x, role="superadmin"
            ).exists()
        )


class AccessRestrictionPermissionTests(TestCase):
    # Ces tests ne vérifient QUE le gate _manager_role (403), qui s'exécute AVANT toute
    # requête vers la base tenant dans les quatre nouveaux endpoints (dataroom_access_
    # view/folder_access_view/document_access_view/access_restrictions_view) — donc
    # testable sans jamais toucher un fichier .sqlite3 de tenant réel (des id fictifs
    # suffisent, la vue 403 avant même de résoudre une Dataroom/Folder/Document).
    # La logique d'application/héritage des restrictions elle-même (AccessRestriction
    # vit en base tenant, comme Dataroom/Document/Folder) n'est PAS couverte par un
    # test automatisé — même limite déjà documentée : TestCase ne gère pas bien les
    # alias de DB tenant enregistrés paresseusement, et un tenant de test fraîchement
    # créé n'a de toute façon pas de schéma migré (seul migrate_all_tenants le fait).
    # Vérifiée manuellement par curl + Chrome + inspection directe des .sqlite3.

    def setUp(self):
        self.office = Office.objects.create(subdomain="accessofficex", name="Access Office")
        self.addCleanup(connections.databases.pop, tenant_alias("accessofficex"), None)
        self.membre = User.objects.create_user(username="access_membre", password="pw123456")
        OfficeMembership.objects.create(user=self.membre, office=self.office, role="membre")

    def test_non_manager_forbidden_on_all_access_read_endpoints(self):
        self.client.force_login(self.membre)
        host = "accessofficex.localhost:8000"

        res = self.client.get("/api/datarooms/999/access/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 403)

        res = self.client.get("/api/datarooms/999/folders/999/access/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 403)

        res = self.client.get("/api/datarooms/999/documents/999/access/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 403)

        res = self.client.get("/api/access-restrictions/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 403)

    def test_non_manager_forbidden_on_write_gate(self):
        self.client.force_login(self.membre)
        res = self.client.post(
            "/api/datarooms/999/access/",
            {"user_ids": [self.membre.id]},
            content_type="application/json",
            HTTP_HOST="accessofficex.localhost:8000",
        )
        self.assertEqual(res.status_code, 403)


class PathVisibilityTests(unittest.TestCase):
    """Teste _level_visible/_subtree_has_accessible_content (visibilité de chemin —
    voir CLAUDE.md, "État réel du code"). Contrairement aux autres tests tenant de ce
    fichier, ceux-ci ÉCRIVENT réellement du Dataroom/Folder/Document/AccessRestriction
    — donc dans un tenant sqlite DÉDIÉ à ce test (pas officea/officeb, les bases de
    démo réelles), migré explicitement via call_command('migrate', ...) — même appel
    que migrate_all_tenants — recréé/supprimé à CHAQUE test (fichier .sqlite3 ET
    entrée connections.databases, via addCleanup).

    **`unittest.TestCase`, pas `django.test.TestCase`/`TransactionTestCase`** : les
    deux ont été tentées et échouent, pour deux raisons DIFFÉRENTES qui se combinent
    en un vrai cul-de-sac pour un alias enregistré dynamiquement :
    - Déclarer `databases = {"default", tenant_alias(SUBDOMAIN)}` fait planter la
      passe `check` globale que Django exécute sur TOUTES les databases nommées par
      TOUTES les classes de test, AVANT que la moindre `setUpClass()` ne tourne
      (`ConnectionDoesNotExist` — l'alias n'existe pas encore à ce moment-là).
    - `databases = '__all__'` (censé se résoudre dynamiquement) évite bien ce premier
      crash, mais `TestCase`/`TransactionTestCase` bloquent quand même toute requête
      vers l'alias au moment du test (`DatabaseOperationForbidden`) — testé
      empiriquement, le mécanisme de permission n'est PAS réévalué dynamiquement au
      moment de l'appel malgré `'__all__'`.
    `unittest.TestCase` ne pose aucun de ces deux pièges (aucun patch de connexion,
    aucune passe `check` par classe) — au prix de perdre `self.client` (recréé
    manuellement via `django.test.Client()`) et tout nettoyage automatique de
    `default` (géré ici via `addCleanup`, comme pour l'alias tenant). Confirme, une
    fois de plus, la limite déjà documentée ailleurs dans ce fichier : "TestCase ne
    roll back pas les bases tenant" — pour un alias enregistré dynamiquement, le
    nettoyage reste entièrement manuel, quel que soit l'angle essayé.

    Les Document créés ici ont un `file` en simple chaîne (pas un vrai fichier
    uploadé) : Django ne déclenche un envoi vers le stockage (MinIO) que si le champ
    reçoit un objet File/UploadedFile "non committed" — une chaîne est traitée comme
    un chemin déjà existant, aucun accès réseau. Les réponses JSON restent utilisables
    (elles exposent `file.url`) : la génération d'URL présignée S3 est un calcul local
    (signature HMAC), pas un appel réseau à MinIO.

    Arborescence construite dans setUp (D1 restreinte à alice ; target_doc restreint à
    bob, plus profond que la restriction de D1) :
        D1 (restreinte à {alice})
        ├── Root A (decoy, pas de restriction propre)
        │    └── decoy_doc (pas de restriction propre)
        └── Root B (pas de restriction propre)
             ├── Root B decoy child (pas de restriction propre, ne mène nulle part)
             └── Mid (pas de restriction propre)
                  ├── decoy_mid_doc (pas de restriction propre)
                  └── target_doc (restreint à {bob})
    """

    SUBDOMAIN = "pathvis"

    def setUp(self):
        self.client = Client()

        self.alias = ensure_tenant_registered(self.SUBDOMAIN)
        call_command("migrate", database=self.alias, verbosity=0)
        db_path = tenant_db_path(self.SUBDOMAIN)

        def _cleanup_tenant_db():
            # Fermer la connexion avant de supprimer le fichier — sinon SQLite garde
            # une poignée ouverte sur Windows et unlink() échoue avec PermissionError.
            connections[self.alias].close()
            connections.databases.pop(self.alias, None)
            db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_tenant_db)

        # Pas de rollback automatique de "default" ici (unittest.TestCase nu) —
        # nettoyage manuel des lignes créées, comme pour l'alias tenant.
        self.office = Office.objects.create(subdomain=self.SUBDOMAIN, name="Path Visibility Office")
        self.addCleanup(self.office.delete)

        self.alice = User.objects.create_user(username="pathvis_alice", password="pw123456")
        self.addCleanup(self.alice.delete)
        OfficeMembership.objects.create(user=self.alice, office=self.office, role="membre")
        self.bob = User.objects.create_user(username="pathvis_bob", password="pw123456")
        self.addCleanup(self.bob.delete)
        OfficeMembership.objects.create(user=self.bob, office=self.office, role="membre")
        self.carol = User.objects.create_user(username="pathvis_carol", password="pw123456")
        self.addCleanup(self.carol.delete)
        OfficeMembership.objects.create(user=self.carol, office=self.office, role="membre")

        # Contexte tenant posé manuellement pour construire l'arborescence directement
        # en base — pas de requête HTTP nécessaire pour ça, seul le middleware pose
        # normalement ce contexte, donc on le fait ici nous-mêmes (même patron que
        # TenantContextTests).
        token = set_current_tenant(TenantContext(self.SUBDOMAIN, self.alias))
        try:
            self.dataroom = Dataroom.objects.create(name="D1")
            AccessRestriction.objects.create(dataroom=self.dataroom, user_ids=[self.alice.id])

            self.root_a = Folder.objects.create(dataroom=self.dataroom, parent=None, name="Root A (decoy)")
            self.decoy_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.root_a, name="decoy.pdf", file="fake/decoy.pdf"
            )

            self.root_b = Folder.objects.create(dataroom=self.dataroom, parent=None, name="Root B")
            self.root_b_decoy = Folder.objects.create(
                dataroom=self.dataroom, parent=self.root_b, name="Root B decoy child"
            )
            self.mid = Folder.objects.create(dataroom=self.dataroom, parent=self.root_b, name="Mid")
            self.decoy_mid_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.mid, name="decoy_mid.pdf", file="fake/decoy_mid.pdf"
            )
            self.target_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.mid, name="target.pdf", file="fake/target.pdf"
            )
            AccessRestriction.objects.create(document=self.target_doc, user_ids=[self.bob.id])
        finally:
            reset_current_tenant(token)

    def _host(self):
        return f"{self.SUBDOMAIN}.localhost:8000"

    def test_deep_nested_document_grants_visibility_along_entire_path(self):
        # Régression explicitement demandée : accès à un document imbriqué sur 2+
        # niveaux — tout le chemin (dataroom incluse) doit être visible, rien d'autre
        # à aucun niveau.
        self.client.force_login(self.bob)
        host = self._host()

        # 1. La dataroom apparaît dans la liste malgré sa restriction directe (alice
        #    uniquement) — visible uniquement via le chemin vers target_doc.
        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertIn(self.dataroom.id, {d["id"] for d in res.json()})

        # 2. À la racine : seul Root B apparaît (Root A ne mène nulle part).
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        data = res.json()
        self.assertEqual([f["id"] for f in data["folders"]], [self.root_b.id])
        self.assertEqual(data["documents"], [])

        # 3. Dans Root B : seul Mid apparaît (Root B decoy child ne mène nulle part).
        res = self.client.get(
            f"/api/datarooms/{self.dataroom.id}/folders/?parent={self.root_b.id}", HTTP_HOST=host
        )
        data = res.json()
        self.assertEqual([f["id"] for f in data["folders"]], [self.mid.id])
        self.assertEqual(data["documents"], [])

        # 4. Dans Mid : seul target_doc apparaît (decoy_mid_doc masqué — filtrage par
        #    _user_can_access, comportement d'héritage inchangé pour les feuilles).
        res = self.client.get(
            f"/api/datarooms/{self.dataroom.id}/folders/?parent={self.mid.id}", HTTP_HOST=host
        )
        data = res.json()
        self.assertEqual(data["folders"], [])
        self.assertEqual([d["id"] for d in data["documents"]], [self.target_doc.id])

    def test_folder_with_multiple_children_only_accessible_branch_shown(self):
        # Régression explicitement demandée : un dossier avec plusieurs enfants dont
        # un seul mène à un accès accordé — seul celui-là doit apparaître.
        self.client.force_login(self.bob)
        res = self.client.get(
            f"/api/datarooms/{self.dataroom.id}/folders/?parent={self.root_b.id}",
            HTTP_HOST=self._host(),
        )
        folder_ids = [f["id"] for f in res.json()["folders"]]
        self.assertEqual(folder_ids, [self.mid.id])
        self.assertNotIn(self.root_b_decoy.id, folder_ids)

    def test_restricted_dataroom_becomes_visible_via_deep_document_access(self):
        # Régression explicitement demandée : une dataroom par ailleurs restreinte
        # pour cet utilisateur redevient visible (mais uniquement le chemin vers
        # l'élément accordé) grâce à un accès document profondément imbriqué.
        host = self._host()

        # alice : accès direct à la dataroom (dans sa restriction), voit tout
        # normalement à la racine — Root A ET Root B.
        self.client.force_login(self.alice)
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        self.assertEqual(
            {f["id"] for f in res.json()["folders"]}, {self.root_a.id, self.root_b.id}
        )

        # bob : exclu de la restriction de la dataroom elle-même, mais la dataroom
        # reste visible dans la liste ET navigable, uniquement via le chemin vers
        # target_doc (Root A masqué, pas de fuite du reste du contenu).
        self.client.force_login(self.bob)
        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertIn(self.dataroom.id, {d["id"] for d in res.json()})
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        self.assertEqual([f["id"] for f in res.json()["folders"]], [self.root_b.id])

        # carol : aucun accès direct ni chemin vers quoi que ce soit dans cette
        # dataroom — ne doit pas apparaître du tout (régression de contrôle, pour
        # prouver que la visibilité de chemin ne s'ouvre pas à tout le monde).
        self.client.force_login(self.carol)
        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertNotIn(self.dataroom.id, {d["id"] for d in res.json()})
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 404)
