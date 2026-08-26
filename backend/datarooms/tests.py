from django.conf import settings
from django.db import connections
from django.test import RequestFactory, TestCase

from .models import Office
from .tenancy.context import get_current_tenant, reset_current_tenant, set_current_tenant, TenantContext
from .tenancy.middleware import TenantResolutionMiddleware
from .tenancy.registry import tenant_alias, tenant_db_path
from .tenancy.router import TenantRouter
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import is_accepted_extension


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
