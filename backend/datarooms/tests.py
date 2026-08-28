import json

from django.conf import settings
from django.contrib.auth.models import User
from django.db import connections
from django.test import RequestFactory, TestCase

from .models import Office, OfficeMembership
from .tenancy.context import get_current_tenant, reset_current_tenant, set_current_tenant, TenantContext
from .tenancy.middleware import TenantResolutionMiddleware
from .tenancy.registry import tenant_alias, tenant_db_path
from .tenancy.router import TenantRouter
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import ThemeValidationError, clean_theme_payload, is_accepted_extension


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

    def test_non_datarooms_apps_are_treated_as_shared(self):
        self.assertTrue(self.router.allow_migrate("default", "auth", "user"))
        self.assertFalse(self.router.allow_migrate("tenant_officea", "auth", "user"))


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


class ThemeValidatorTests(TestCase):
    def _payload(self, **overrides):
        base = {
            "colors": {"light": {"bg": "#fafafd"}, "dark": {"bg": "#100d1f"}},
            "typography": "classique",
            "shape": "equilibre",
        }
        base.update(overrides)
        return base

    def test_accepts_and_normalizes_a_valid_payload(self):
        cleaned = clean_theme_payload(self._payload())
        self.assertEqual(set(cleaned), {"colors", "typography", "shape"})
        self.assertEqual(cleaned["colors"]["light"]["bg"], "#fafafd")

    def test_drops_unknown_top_level_keys(self):
        # Le stockage ne doit contenir que les trois clés du contrat : un client
        # qui envoie du rab ne pollue pas Office.theme.
        cleaned = clean_theme_payload(self._payload(surprise={"a": 1}))
        self.assertNotIn("surprise", cleaned)

    def test_rejects_unknown_presets(self):
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(self._payload(typography="comic"))
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(self._payload(shape="triangulaire"))

    def test_rejects_css_escape_characters_in_a_value(self):
        # La valeur finit dans une déclaration CSS générée côté front : une accolade
        # permettrait de fermer la règle et d'en injecter d'autres.
        payload = self._payload()
        payload["colors"]["light"]["bg"] = "#fff} body{display:none"
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(payload)

    def test_rejects_malformed_token_names(self):
        payload = self._payload()
        payload["colors"]["light"]["Fond Principal"] = "#fff"
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(payload)

    # --- Disposition de la navigation (bloc `layout`) ----------------------

    def test_accepts_a_full_layout_block(self):
        cleaned = clean_theme_payload(
            self._payload(
                layout={
                    "navPlacement": "bottom",
                    "navSize": "rail",
                    "navDensity": "aere",
                    "navActive": "barre",
                    "showSectionLabels": True,
                    "showBadges": False,
                    "showPoweredBy": False,
                }
            )
        )
        self.assertEqual(cleaned["layout"]["navPlacement"], "bottom")
        self.assertEqual(cleaned["layout"]["navActive"], "barre")
        self.assertIs(cleaned["layout"]["showBadges"], False)

    def test_theme_without_layout_stays_without_layout(self):
        # Cas des thèmes enregistrés AVANT l'existence du bloc : ils doivent
        # continuer à s'enregistrer, et ne pas gagner une disposition au passage
        # (le front applique ses défauts, qui sont la navigation d'origine).
        cleaned = clean_theme_payload(self._payload())
        self.assertNotIn("layout", cleaned)

    def test_partial_layout_keeps_only_what_was_sent(self):
        cleaned = clean_theme_payload(self._payload(layout={"navPlacement": "right"}))
        self.assertEqual(cleaned["layout"], {"navPlacement": "right"})

    def test_rejects_unknown_layout_values(self):
        # Une valeur inconnue deviendrait un attribut data-nav-* qu'aucun
        # sélecteur ne reconnaît : navigation invisible, sans message d'erreur.
        for bad in (
            {"navPlacement": "diagonale"},
            {"navSize": "enorme"},
            {"navDensity": "moyenne"},
            {"navActive": "clignotant"},
        ):
            with self.assertRaises(ThemeValidationError):
                clean_theme_payload(self._payload(layout=bad))

    def test_rejects_non_boolean_layout_flags(self):
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(self._payload(layout={"showBadges": "oui"}))

    def test_rejects_a_layout_that_is_not_an_object(self):
        with self.assertRaises(ThemeValidationError):
            clean_theme_payload(self._payload(layout="left"))

    def test_drops_unknown_keys_inside_layout(self):
        cleaned = clean_theme_payload(
            self._payload(layout={"navPlacement": "top", "navRainbow": True})
        )
        self.assertNotIn("navRainbow", cleaned["layout"])


class TenantThemeApiTests(TestCase):
    """GET/PUT /api/tenant-theme/ — persistance de la personnalisation par office."""

    HOST = "officea.localhost"

    def setUp(self):
        self.addCleanup(connections.databases.pop, tenant_alias("officea"), None)
        self.addCleanup(connections.databases.pop, tenant_alias("officeb"), None)
        self.office = Office.objects.create(subdomain="officea", name="Office A")
        self.other_office = Office.objects.create(subdomain="officeb", name="Office B")

        self.admin = User.objects.create_user(username="admin-a", password="motdepasse")
        OfficeMembership.objects.create(user=self.admin, office=self.office, role="admin")

        self.membre = User.objects.create_user(username="membre-a", password="motdepasse")
        OfficeMembership.objects.create(user=self.membre, office=self.office, role="membre")

        self.etranger = User.objects.create_user(username="etranger", password="motdepasse")
        OfficeMembership.objects.create(user=self.etranger, office=self.other_office, role="admin")

    def _theme(self, bg="#ffffff"):
        return {
            "colors": {"light": {"bg": bg}, "dark": {"bg": "#100d1f"}},
            "typography": "moderne",
            "shape": "arrondi",
        }

    def _put(self, theme):
        return self.client.put(
            "/api/tenant-theme/",
            data=json.dumps(theme),
            content_type="application/json",
            HTTP_HOST=self.HOST,
        )

    def test_get_returns_204_when_office_never_customised(self):
        # 204 et pas 200 avec un objet vide : le front doit pouvoir distinguer
        # « jamais personnalisé » (→ valeurs Notantis) de « personnalisé en blanc ».
        self.client.force_login(self.admin)
        res = self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST)
        self.assertEqual(res.status_code, 204)

    def test_admin_can_save_then_read_back(self):
        self.client.force_login(self.admin)
        self.assertEqual(self._put(self._theme("#eeeeee")).status_code, 200)

        res = self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["colors"]["light"]["bg"], "#eeeeee")
        self.assertEqual(res.json()["typography"], "moderne")

    def test_navigation_layout_survives_the_round_trip(self):
        # La disposition de la navigation est une personnalisation d'office au
        # même titre que les couleurs : elle doit revenir telle quelle, sinon
        # l'étude retrouve sa navigation à gauche au prochain chargement.
        self.client.force_login(self.admin)
        theme = self._theme()
        theme["layout"] = {"navPlacement": "bottom", "navSize": "rail", "showPoweredBy": False}
        self.assertEqual(self._put(theme).status_code, 200)

        res = self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST)
        self.assertEqual(res.json()["layout"]["navPlacement"], "bottom")
        self.assertEqual(res.json()["layout"]["navSize"], "rail")
        self.assertIs(res.json()["layout"]["showPoweredBy"], False)

    def test_an_invalid_layout_is_refused_without_touching_the_stored_theme(self):
        self.client.force_login(self.admin)
        self._put(self._theme("#eeeeee"))
        bad = self._theme("#123456")
        bad["layout"] = {"navPlacement": "diagonale"}

        self.assertEqual(self._put(bad).status_code, 400)
        self.office.refresh_from_db()
        self.assertEqual(self.office.theme["colors"]["light"]["bg"], "#eeeeee")

    def test_saved_theme_is_scoped_to_the_office(self):
        # Le point de toute l'opération : deux offices ne partagent pas leur thème.
        self.client.force_login(self.admin)
        self._put(self._theme("#eeeeee"))
        self.other_office.refresh_from_db()
        self.assertIsNone(self.other_office.theme)

    def test_membre_can_read_but_not_write(self):
        self.client.force_login(self.membre)
        self.assertEqual(self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST).status_code, 204)
        self.assertEqual(self._put(self._theme()).status_code, 403)

    def test_non_member_is_refused(self):
        self.client.force_login(self.etranger)
        self.assertEqual(self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST).status_code, 403)

    def test_anonymous_is_refused(self):
        self.assertIn(self.client.get("/api/tenant-theme/", HTTP_HOST=self.HOST).status_code, (401, 403))

    def test_unknown_subdomain_returns_404(self):
        self.client.force_login(self.admin)
        res = self.client.get("/api/tenant-theme/", HTTP_HOST="inconnu.localhost")
        self.assertEqual(res.status_code, 404)

    def test_invalid_payload_is_refused_and_nothing_is_stored(self):
        self.client.force_login(self.admin)
        res = self._put({"colors": {}, "typography": "comic", "shape": "arrondi"})
        self.assertEqual(res.status_code, 400)
        self.office.refresh_from_db()
        self.assertIsNone(self.office.theme)


class ModuleAccessTests(TestCase):
    """Activation d'un module par office — le pari n°1 du POC.

    L'écran de module du front repose entièrement sur ces trois réponses : 200
    affiche le contenu, 403 dit « non activé pour cet office », 404 dit « activé
    mais pas encore d'écran livré ». Si l'une d'elles change, l'écran ment.
    """

    def setUp(self):
        self.addCleanup(connections.databases.pop, tenant_alias("officea"), None)
        self.addCleanup(connections.databases.pop, tenant_alias("officeb"), None)

        from .models import Module

        self.coffre_fort = Module.objects.create(slug="coffre-fort", name="Coffre-fort")
        self.office_a = Office.objects.create(subdomain="officea", name="Office A")
        self.office_a.enabled_modules.add(self.coffre_fort)
        self.office_b = Office.objects.create(subdomain="officeb", name="Office B")

        self.user = User.objects.create_user(username="alice", password="motdepasse")
        OfficeMembership.objects.create(user=self.user, office=self.office_a, role="admin")
        OfficeMembership.objects.create(user=self.user, office=self.office_b, role="admin")
        self.client.force_login(self.user)

    def test_enabled_module_serves_its_content(self):
        res = self.client.get("/api/modules/coffre-fort/", HTTP_HOST="officea.localhost")
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", res.json())

    def test_same_module_is_refused_on_an_office_without_it(self):
        # Même utilisateur, même module, autre office : c'est la démonstration
        # que l'activation est bien portée par l'office et non par le code.
        res = self.client.get("/api/modules/coffre-fort/", HTTP_HOST="officeb.localhost")
        self.assertEqual(res.status_code, 403)

    def test_deactivating_the_module_closes_access_without_redeploy(self):
        self.office_a.enabled_modules.remove(self.coffre_fort)
        res = self.client.get("/api/modules/coffre-fort/", HTTP_HOST="officea.localhost")
        self.assertEqual(res.status_code, 403)

    def test_unknown_module_slug_is_a_404(self):
        res = self.client.get("/api/modules/inexistant/", HTTP_HOST="officea.localhost")
        self.assertEqual(res.status_code, 404)


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
