import json
import sqlite3
import unittest
from binascii import unhexlify

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connections
from django.test import Client, RequestFactory, TestCase
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice

from .models import (
    AccessRestriction, Dataroom, Document, Folder, HyperadminAccess, Module, Office, OfficeMembership, Tag,
)
from .tenancy.context import get_current_tenant, reset_current_tenant, set_current_tenant, TenantContext
from .tenancy.middleware import TenantResolutionMiddleware
from .tenancy.registry import ensure_tenant_registered, tenant_alias, tenant_db_path
from .tenancy.router import TenantRouter
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import (
    DASHBOARD_MAX_PAGES, DASHBOARD_MAX_PAGE_NAME, DASHBOARD_MAX_WIDGETS,
    DashboardValidationError, TagValidationError, ThemeValidationError,
    clean_dashboard_payload, clean_tag_payload, clean_theme_payload,
    is_accepted_extension, tag_slug,
)

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


class DashboardValidatorTests(TestCase):
    """clean_dashboard_payload — ce que le serveur accepte de stocker.

    Le validateur ne connaît PAS le catalogue des widgets (il vit côté front) :
    ces tests vérifient donc uniquement qu'aucune charge utile déformée ne
    franchit la porte, pas qu'un identifiant existe.
    """

    def _widget(self, **overrides):
        widget = {"id": "dossiers-actifs", "x": 0, "y": 0, "w": 3, "h": 2}
        widget.update(overrides)
        return widget

    def _page(self, **overrides):
        page = {"id": "ecran-1", "name": "Accueil", "widgets": [self._widget()]}
        page.update(overrides)
        return page

    def test_a_minimal_payload_is_normalised(self):
        cleaned = clean_dashboard_payload({"pages": [self._page()]})
        self.assertEqual(cleaned["template"], None)
        self.assertEqual(cleaned["pages"][0]["widgets"][0]["id"], "dossiers-actifs")

    def test_extra_keys_are_dropped(self):
        # Rien d'autre que la forme attendue ne doit atterrir en base : un client
        # bricolé ne doit pas pouvoir faire grossir le JSON à sa guise.
        cleaned = clean_dashboard_payload({
            "pages": [self._page(widgets=[self._widget(couleur="rouge")], surprise=1)],
            "note": "x" * 5000,
        })
        self.assertEqual(set(cleaned), {"template", "pages"})
        self.assertEqual(set(cleaned["pages"][0]), {"id", "name", "widgets"})
        self.assertEqual(set(cleaned["pages"][0]["widgets"][0]), {"id", "x", "y", "w", "h"})

    def test_legacy_flat_payload_becomes_one_page(self):
        # Compatibilité : les dispositions d'avant les onglets ne doivent PAS
        # être refusées, sinon tout le monde perd son rangement au déploiement.
        cleaned = clean_dashboard_payload({"template": "membre", "widgets": [self._widget()]})
        self.assertEqual(len(cleaned["pages"]), 1)
        self.assertEqual(cleaned["pages"][0]["widgets"][0]["id"], "dossiers-actifs")

    def test_unknown_widget_id_is_accepted(self):
        # Volontaire : le catalogue vit côté front, le serveur ne l'arbitre pas.
        cleaned = clean_dashboard_payload(
            {"pages": [self._page(widgets=[self._widget(id="widget-de-2027")])]}
        )
        self.assertEqual(cleaned["pages"][0]["widgets"][0]["id"], "widget-de-2027")

    def test_duplicate_widget_in_one_page_is_refused(self):
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(widgets=[self._widget(), self._widget()])]})

    def test_same_widget_on_two_pages_is_allowed(self):
        # Le même widget sur deux onglets est un usage normal : ses dossiers
        # récents peuvent servir sur plusieurs écrans.
        cleaned = clean_dashboard_payload({"pages": [self._page(), self._page(id="ecran-2")]})
        self.assertEqual(len(cleaned["pages"]), 2)

    def test_duplicate_page_id_is_refused(self):
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(), self._page()]})

    def test_empty_page_name_is_refused(self):
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(name="   ")]})

    def test_control_characters_are_stripped_from_page_name(self):
        cleaned = clean_dashboard_payload({"pages": [self._page(name="Pilo\u0000tage")]})
        self.assertEqual(cleaned["pages"][0]["name"], "Pilotage")

    def test_page_name_is_truncated(self):
        cleaned = clean_dashboard_payload({"pages": [self._page(name="N" * 500)]})
        self.assertEqual(len(cleaned["pages"][0]["name"]), DASHBOARD_MAX_PAGE_NAME)

    def test_boolean_coordinates_are_refused(self):
        # `isinstance(True, int)` vaut True en Python : sans garde-fou explicite,
        # un booléen passerait pour une coordonnée et vaudrait 0 ou 1 en silence.
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(widgets=[self._widget(x=True)])]})

    def test_out_of_range_coordinates_are_refused(self):
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(widgets=[self._widget(w=999)])]})

    def test_too_many_widgets_are_refused(self):
        widgets = [self._widget(id=f"widget-{i}") for i in range(DASHBOARD_MAX_WIDGETS + 1)]
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": [self._page(widgets=widgets)]})

    def test_too_many_pages_are_refused(self):
        pages = [self._page(id=f"ecran-{i}") for i in range(DASHBOARD_MAX_PAGES + 1)]
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": pages})

    def test_at_least_one_page_is_required(self):
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"pages": []})
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload({"template": "notaire"})

    def test_options_survive_but_stay_flat(self):
        cleaned = clean_dashboard_payload(
            {"pages": [self._page(widgets=[self._widget(options={"lignes": 5})])]}
        )
        self.assertEqual(cleaned["pages"][0]["widgets"][0]["options"], {"lignes": 5})
        with self.assertRaises(DashboardValidationError):
            clean_dashboard_payload(
                {"pages": [self._page(widgets=[self._widget(options={"a": {"b": 1}})])]}
            )


class DashboardApiTests(TestCase):
    """GET/PUT/DELETE /api/dashboard/ — disposition d'accueil PAR MEMBRE."""

    HOST = "officea.localhost"

    def setUp(self):
        self.addCleanup(connections.databases.pop, tenant_alias("officea"), None)
        self.addCleanup(connections.databases.pop, tenant_alias("officeb"), None)
        self.office = Office.objects.create(subdomain="officea", name="Office A")
        self.other_office = Office.objects.create(subdomain="officeb", name="Office B")

        self.membre = User.objects.create_user(username="membre-a", password="motdepasse")
        self.membership = OfficeMembership.objects.create(
            user=self.membre, office=self.office, role="membre"
        )
        self.collegue = User.objects.create_user(username="collegue-a", password="motdepasse")
        self.membership_collegue = OfficeMembership.objects.create(
            user=self.collegue, office=self.office, role="membre"
        )
        self.etranger = User.objects.create_user(username="etranger", password="motdepasse")
        OfficeMembership.objects.create(user=self.etranger, office=self.other_office, role="admin")

    def _put(self, payload):
        return self.client.put(
            "/api/dashboard/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_HOST=self.HOST,
        )

    def _layout(self, widget_id="dossiers-actifs"):
        return {
            "template": "membre",
            "pages": [{
                "id": "ecran-1",
                "name": "Mon travail",
                "widgets": [{"id": widget_id, "x": 0, "y": 0, "w": 3, "h": 2}],
            }],
        }

    def test_get_returns_204_when_never_customised(self):
        # 204 et pas une liste vide : le front doit distinguer « jamais rangé »
        # (→ template du rôle) de « rangé, et vidé de tous ses widgets ».
        self.client.force_login(self.membre)
        res = self.client.get("/api/dashboard/", HTTP_HOST=self.HOST)
        self.assertEqual(res.status_code, 204)

    def test_save_then_read_back(self):
        self.client.force_login(self.membre)
        self.assertEqual(self._put(self._layout()).status_code, 200)

        res = self.client.get("/api/dashboard/", HTTP_HOST=self.HOST)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["template"], "membre")
        self.assertEqual(res.json()["pages"][0]["name"], "Mon travail")
        self.assertEqual(res.json()["pages"][0]["widgets"][0]["id"], "dossiers-actifs")

    def test_a_layout_stored_before_tabs_is_read_as_one_page(self):
        # Régression : une ligne écrite avant les onglets doit rester lisible.
        # Sans conversion à la lecture, le front n'y trouve pas de `pages`,
        # retombe sur le template, et le rangement de l'utilisateur disparaît.
        self.membership.dashboard = {
            "template": "membre",
            "widgets": [{"id": "dossiers-actifs", "x": 0, "y": 0, "w": 3, "h": 2}],
        }
        self.membership.save(update_fields=["dashboard"])
        self.client.force_login(self.membre)

        res = self.client.get("/api/dashboard/", HTTP_HOST=self.HOST)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["pages"]), 1)
        self.assertEqual(res.json()["pages"][0]["widgets"][0]["id"], "dossiers-actifs")

    def test_a_membre_may_write_his_own_dashboard(self):
        # Contrairement au thème d'office, l'écriture n'est PAS réservée aux
        # administrateurs : ce que chacun range chez lui ne regarde que lui.
        self.client.force_login(self.membre)
        self.assertEqual(self._put(self._layout()).status_code, 200)

    def test_dashboard_is_scoped_to_the_member(self):
        # Le point de toute l'opération : deux membres du MÊME office ne
        # partagent pas leur accueil.
        self.client.force_login(self.membre)
        self._put(self._layout())
        self.membership_collegue.refresh_from_db()
        self.assertIsNone(self.membership_collegue.dashboard)

    def test_delete_clears_the_customisation(self):
        self.client.force_login(self.membre)
        self._put(self._layout())
        self.assertEqual(self.client.delete("/api/dashboard/", HTTP_HOST=self.HOST).status_code, 204)
        self.assertEqual(self.client.get("/api/dashboard/", HTTP_HOST=self.HOST).status_code, 204)

    def test_saving_does_not_touch_the_role(self):
        # `save(update_fields=['dashboard'])` : ranger son accueil ne doit pas
        # réécrire un rôle modifié entre-temps par un administrateur.
        self.client.force_login(self.membre)
        self._put(self._layout())
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.role, "membre")

    def test_invalid_payload_is_refused_and_nothing_is_stored(self):
        self.client.force_login(self.membre)
        self.assertEqual(self._put({"pages": "beaucoup"}).status_code, 400)
        self.membership.refresh_from_db()
        self.assertIsNone(self.membership.dashboard)

    def test_non_member_is_refused(self):
        self.client.force_login(self.etranger)
        self.assertEqual(self.client.get("/api/dashboard/", HTTP_HOST=self.HOST).status_code, 403)

    def test_anonymous_is_refused(self):
        self.assertIn(self.client.get("/api/dashboard/", HTTP_HOST=self.HOST).status_code, (401, 403))

    def test_unknown_subdomain_returns_404(self):
        self.client.force_login(self.membre)
        self.assertEqual(
            self.client.get("/api/dashboard/", HTTP_HOST="inconnu.localhost").status_code, 404
        )


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
    # login_view vérifie désormais l'appartenance à l'office du sous-domaine
    # (01/09/2026, voir CLAUDE.md — faille corrigée : n'importe quel compte
    # pouvait auparavant ouvrir une session sur n'importe quel office, même sans
    # y être rattaché). Ces tests utilisent donc un Host réel + OfficeMembership
    # pour "enrollee". mfa_setup/mfa_verify, eux, restent office-agnostiques :
    # une fois la porte franchie à /api/login/, ils n'agissent que sur
    # request.session['mfa_user_id'], sans revérifier request.office — testables
    # avec le Client Django normal, pas la limite déjà documentée sur les alias
    # tenant enregistrés paresseusement.
    #
    # Host réel => TenantResolutionMiddleware appelle ensure_tenant_registered,
    # qui mute le dict global connections.databases — même piège déjà documenté
    # pour test_sso_ticket_consumption_never_triggers_mfa, nettoyé pareil.

    HOST = "mfaoffice.localhost:8000"

    def setUp(self):
        self.addCleanup(connections.databases.pop, tenant_alias("mfaoffice"), None)
        self.office = Office.objects.create(subdomain="mfaoffice", name="MFA Office")
        self.user = User.objects.create_user(username="enrollee", password="pw123456")
        OfficeMembership.objects.create(user=self.user, office=self.office, role="membre")

    def _login(self):
        return self.client.post(
            "/api/login/",
            {"username": "enrollee", "password": "pw123456"},
            content_type="application/json",
            HTTP_HOST=self.HOST,
        )

    def test_login_rejected_for_user_without_office_membership(self):
        # Régression explicitement demandée : la faille corrigée aujourd'hui —
        # un compte valide mais sans OfficeMembership sur CET office précis ne
        # doit plus jamais pouvoir entamer une connexion ici.
        outsider = User.objects.create_user(username="outsider", password="pw123456")
        res = self.client.post(
            "/api/login/",
            {"username": "outsider", "password": "pw123456"},
            content_type="application/json",
            HTTP_HOST=self.HOST,
        )
        self.assertEqual(res.status_code, 403)
        # Aucune session MFA en attente n'a été ouverte pour autant.
        self.assertIsNone(self.client.session.get('mfa_user_id'))

    def test_login_rejected_for_unresolved_subdomain(self):
        res = self.client.post(
            "/api/login/",
            {"username": "enrollee", "password": "pw123456"},
            content_type="application/json",
            HTTP_HOST="doesnotexist.localhost:8000",
        )
        self.assertEqual(res.status_code, 404)

    def test_hyperadmin_can_login_on_office_without_membership(self):
        # Exception délibérée à la vérification d'appartenance : un hyperadmin
        # n'a par construction aucun OfficeMembership nulle part (voir
        # HyperadminAccess) et doit pouvoir se connecter depuis n'importe quel
        # sous-domaine d'office (pas de sous-domaine dédié, voir CLAUDE.md).
        hyperadmin = User.objects.create_user(username="hat_login", password="pw123456")
        HyperadminAccess.objects.create(user=hyperadmin)
        res = self.client.post(
            "/api/login/",
            {"username": "hat_login", "password": "pw123456"},
            content_type="application/json",
            HTTP_HOST=self.HOST,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"mfa_required": True, "enrollment": True})

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


class RoleBasedDefaultAccessTests(unittest.TestCase):
    """Teste le changement de comportement du 01/09/2026 (voir CLAUDE.md,
    "État réel du code") : _user_can_access, quand AUCUNE restriction n'existe sur
    toute la chaîne (le cas "accès ouvert à tout membre de l'office" jusqu'ici),
    consulte désormais le rôle de l'appelant pour CET office précis — membre/admin/
    superadmin gardent l'accès ouvert par défaut (inchangé), un client n'a PAS accès
    par défaut. _nearest_restriction n'est pas touchée : dès qu'une restriction
    existe quelque part sur la chaîne, seule l'appartenance à `user_ids` compte,
    peu importe le rôle — ces tests-ci portent uniquement sur le cas "aucune
    restriction nulle part".

    Même patron que PathVisibilityTests ci-dessus (unittest.TestCase nu, tenant
    sqlite dédié migré/nettoyé par test) et mêmes raisons documentées là-bas :
    TestCase/TransactionTestCase ne supportent pas un alias enregistré
    dynamiquement pour ce genre d'écriture réelle en base tenant.

    Arborescence construite dans setUp, SANS AUCUNE restriction (le cas par défaut
    à tester) :
        D2
        └── F1
            └── doc_in_f1
        └── doc_root (à la racine de D2, pas dans F1)
    """

    SUBDOMAIN = "roledefault"

    def setUp(self):
        self.client = Client()

        self.alias = ensure_tenant_registered(self.SUBDOMAIN)
        call_command("migrate", database=self.alias, verbosity=0)
        db_path = tenant_db_path(self.SUBDOMAIN)

        def _cleanup_tenant_db():
            connections[self.alias].close()
            connections.databases.pop(self.alias, None)
            db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_tenant_db)

        self.office = Office.objects.create(subdomain=self.SUBDOMAIN, name="Role Default Office")
        self.addCleanup(self.office.delete)

        self.client_user = User.objects.create_user(username="roledefault_client", password="pw123456")
        self.addCleanup(self.client_user.delete)
        OfficeMembership.objects.create(user=self.client_user, office=self.office, role="client")

        self.membre_user = User.objects.create_user(username="roledefault_membre", password="pw123456")
        self.addCleanup(self.membre_user.delete)
        OfficeMembership.objects.create(user=self.membre_user, office=self.office, role="membre")

        token = set_current_tenant(TenantContext(self.SUBDOMAIN, self.alias))
        try:
            self.dataroom = Dataroom.objects.create(name="D2")
            self.f1 = Folder.objects.create(dataroom=self.dataroom, parent=None, name="F1")
            self.doc_root = Document.objects.create(
                dataroom=self.dataroom, folder=None, name="root.pdf", file="fake/root.pdf"
            )
            self.doc_in_f1 = Document.objects.create(
                dataroom=self.dataroom, folder=self.f1, name="in_f1.pdf", file="fake/in_f1.pdf"
            )
        finally:
            reset_current_tenant(token)

    def _host(self):
        return f"{self.SUBDOMAIN}.localhost:8000"

    def test_client_without_restriction_sees_nothing(self):
        # Aucune restriction nulle part dans D2 — pour un client, le nouveau défaut
        # est FERMÉ : ni la dataroom, ni F1, ni les documents ne doivent apparaître,
        # à aucun niveau (visibilité ET accès direct).
        self.client.force_login(self.client_user)
        host = self._host()

        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertNotIn(self.dataroom.id, {d["id"] for d in res.json()})

        # _level_visible(dataroom) doit être False : 404, pas une liste vide — même
        # logique de non-confirmation d'existence que le reste de l'API.
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 404)

        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/documents/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 404)

    def test_client_with_explicit_restriction_sees_that_level_and_path_to_it(self):
        # Une restriction EXPLICITE nommant le client à un niveau précis doit lui
        # donner accès à ce niveau, exactement comme n'importe quel autre rôle —
        # _nearest_restriction n'est pas affectée par ce changement, seul le cas
        # "aucune restriction" l'est.
        token = set_current_tenant(TenantContext(self.SUBDOMAIN, self.alias))
        try:
            AccessRestriction.objects.create(document=self.doc_in_f1, user_ids=[self.client_user.id])
        finally:
            reset_current_tenant(token)

        self.client.force_login(self.client_user)
        host = self._host()

        # La dataroom redevient visible (visibilité de chemin, comme pour tout
        # autre rôle) malgré l'absence d'accès direct au niveau racine.
        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertIn(self.dataroom.id, {d["id"] for d in res.json()})

        # À la racine : F1 apparaît (mène à l'accès accordé), doc_root N'apparaît
        # PAS (pas de restriction l'incluant, et le défaut client est fermé).
        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        data = res.json()
        self.assertEqual([f["id"] for f in data["folders"]], [self.f1.id])
        self.assertEqual(data["documents"], [])

        # Dans F1 : doc_in_f1 apparaît (accès direct via la restriction explicite).
        res = self.client.get(
            f"/api/datarooms/{self.dataroom.id}/folders/?parent={self.f1.id}", HTTP_HOST=host
        )
        data = res.json()
        self.assertEqual([d["id"] for d in data["documents"]], [self.doc_in_f1.id])

    def test_member_without_restriction_keeps_open_access(self):
        # Régression de contrôle : le changement ne doit affecter QUE le rôle
        # client — un membre (comme un admin/superadmin) garde l'accès ouvert par
        # défaut quand aucune restriction n'existe nulle part, comportement
        # historique inchangé.
        self.client.force_login(self.membre_user)
        host = self._host()

        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        self.assertIn(self.dataroom.id, {d["id"] for d in res.json()})

        res = self.client.get(f"/api/datarooms/{self.dataroom.id}/folders/", HTTP_HOST=host)
        data = res.json()
        self.assertEqual([f["id"] for f in data["folders"]], [self.f1.id])
        self.assertEqual([d["id"] for d in data["documents"]], [self.doc_root.id])

        res = self.client.get(
            f"/api/datarooms/{self.dataroom.id}/folders/?parent={self.f1.id}", HTTP_HOST=host
        )
        data = res.json()
        self.assertEqual([d["id"] for d in data["documents"]], [self.doc_in_f1.id])


class DataroomTemplateTests(unittest.TestCase):
    """Teste le système de templates de dataroom (01/09/2026, voir CLAUDE.md,
    "État réel du code") : CRUD `Template`/`TemplateFolder` (`/api/templates/...`,
    réservé admin/superadmin — _manager_role, même gate que la gestion des
    utilisateurs), et le paramètre `template_id` optionnel de `POST
    /api/datarooms/` (`_apply_template`). S'appuie directement sur le changement
    de défaut d'accès par rôle du même jour (`_user_can_access`) :
    `visible_to_roles` sur un `TemplateFolder` se traduit en une vraie
    `AccessRestriction` sur le `Folder` réel, résolue au moment de l'application
    — jamais un lien vivant vers le `Template` d'origine.

    Même patron que `PathVisibilityTests`/`RoleBasedDefaultAccessTests` ci-dessus
    (`unittest.TestCase` nu, tenant sqlite dédié migré/nettoyé par test — mêmes
    raisons documentées là-bas), mais SANS écriture ORM directe dans `setUp` :
    `Template`/`TemplateFolder`/`Dataroom`/`Folder` sont tous des modèles tenant
    créés uniquement via les endpoints eux-mêmes dans chaque test —
    `TenantResolutionMiddleware` pose le contexte tenant à partir du `Host` de
    chaque requête HTTP, pas besoin de `set_current_tenant` manuel ici."""

    SUBDOMAIN = "templatetest"

    def setUp(self):
        self.client = Client()

        self.alias = ensure_tenant_registered(self.SUBDOMAIN)
        call_command("migrate", database=self.alias, verbosity=0)
        db_path = tenant_db_path(self.SUBDOMAIN)

        def _cleanup_tenant_db():
            connections[self.alias].close()
            connections.databases.pop(self.alias, None)
            db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_tenant_db)

        self.office = Office.objects.create(subdomain=self.SUBDOMAIN, name="Template Test Office")
        self.addCleanup(self.office.delete)

        self.admin_user = User.objects.create_user(username="templatetest_admin", password="pw123456")
        self.addCleanup(self.admin_user.delete)
        OfficeMembership.objects.create(user=self.admin_user, office=self.office, role="admin")

        self.membre_user = User.objects.create_user(username="templatetest_membre", password="pw123456")
        self.addCleanup(self.membre_user.delete)
        OfficeMembership.objects.create(user=self.membre_user, office=self.office, role="membre")

        self.client_user = User.objects.create_user(username="templatetest_client", password="pw123456")
        self.addCleanup(self.client_user.delete)
        OfficeMembership.objects.create(user=self.client_user, office=self.office, role="client")

    def _host(self):
        return f"{self.SUBDOMAIN}.localhost:8000"

    def test_dataroom_from_template_reproduces_tree_and_resolves_role_restrictions(self):
        self.client.force_login(self.admin_user)
        host = self._host()

        res = self.client.post(
            "/api/templates/", {"name": "Succession standard"},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        template_id = res.json()["id"]

        res = self.client.post(
            f"/api/templates/{template_id}/folders/",
            {"name": "Pièces d'identité"},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        root_tf_id = res.json()["id"]

        res = self.client.post(
            f"/api/templates/{template_id}/folders/",
            {"name": "Confidentiel client", "parent": root_tf_id, "visible_to_roles": ["admin", "membre"]},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.post(
            "/api/datarooms/",
            {"name": "Dossier Succession Dupont", "template_id": template_id},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        dataroom_id = res.json()["id"]

        # Racine de la dataroom : un seul dossier réel, reproduisant "Pièces d'identité".
        res = self.client.get(f"/api/datarooms/{dataroom_id}/folders/", HTTP_HOST=host)
        data = res.json()
        self.assertEqual(len(data["folders"]), 1)
        self.assertEqual(data["folders"][0]["name"], "Pièces d'identité")
        real_root_id = data["folders"][0]["id"]

        # Aucune restriction sur ce dossier (visible_to_roles vide au template).
        res = self.client.get(f"/api/datarooms/{dataroom_id}/folders/{real_root_id}/access/", HTTP_HOST=host)
        self.assertEqual(res.json()["user_ids"], [])

        # Sous-dossier : reproduit, ET restriction résolue exactement à admin+membre.
        res = self.client.get(f"/api/datarooms/{dataroom_id}/folders/?parent={real_root_id}", HTTP_HOST=host)
        data = res.json()
        self.assertEqual(len(data["folders"]), 1)
        self.assertEqual(data["folders"][0]["name"], "Confidentiel client")
        real_sub_id = data["folders"][0]["id"]

        res = self.client.get(f"/api/datarooms/{dataroom_id}/folders/{real_sub_id}/access/", HTTP_HOST=host)
        self.assertEqual(
            sorted(res.json()["user_ids"]), sorted([self.admin_user.id, self.membre_user.id])
        )

    def test_editing_template_after_creation_does_not_affect_existing_dataroom(self):
        self.client.force_login(self.admin_user)
        host = self._host()

        res = self.client.post(
            "/api/templates/", {"name": "Vente"}, content_type="application/json", HTTP_HOST=host
        )
        template_id = res.json()["id"]

        res = self.client.post(
            f"/api/templates/{template_id}/folders/", {"name": "A"},
            content_type="application/json", HTTP_HOST=host,
        )
        tf_a_id = res.json()["id"]

        res = self.client.post(
            "/api/datarooms/", {"name": "D1", "template_id": template_id},
            content_type="application/json", HTTP_HOST=host,
        )
        d1_id = res.json()["id"]

        # On modifie le template APRÈS la création de D1 : renomme "A" en "B",
        # ajoute un nouveau dossier "C".
        res = self.client.patch(
            f"/api/templates/{template_id}/folders/{tf_a_id}/",
            {"name": "B"}, content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 200)
        res = self.client.post(
            f"/api/templates/{template_id}/folders/", {"name": "C"},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)

        # D1, créée AVANT la modification, garde "A" et ne voit jamais "C" —
        # aucun lien vivant vers le Template.
        res = self.client.get(f"/api/datarooms/{d1_id}/folders/", HTTP_HOST=host)
        names = {f["name"] for f in res.json()["folders"]}
        self.assertEqual(names, {"A"})

        # Une NOUVELLE dataroom créée maintenant obtient bien "B"+"C" — preuve que
        # la copie est réellement indépendante, pas une référence partagée.
        res = self.client.post(
            "/api/datarooms/", {"name": "D2", "template_id": template_id},
            content_type="application/json", HTTP_HOST=host,
        )
        d2_id = res.json()["id"]
        res = self.client.get(f"/api/datarooms/{d2_id}/folders/", HTTP_HOST=host)
        names = {f["name"] for f in res.json()["folders"]}
        self.assertEqual(names, {"B", "C"})

    def test_dataroom_without_template_unchanged(self):
        self.client.force_login(self.admin_user)
        host = self._host()

        res = self.client.post(
            "/api/datarooms/", {"name": "Sans modèle"}, content_type="application/json", HTTP_HOST=host
        )
        self.assertEqual(res.status_code, 201)
        dataroom_id = res.json()["id"]

        res = self.client.get(f"/api/datarooms/{dataroom_id}/folders/", HTTP_HOST=host)
        data = res.json()
        self.assertEqual(data["folders"], [])
        self.assertEqual(data["documents"], [])

    def test_invalid_template_id_returns_400(self):
        self.client.force_login(self.admin_user)
        host = self._host()

        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        before = {d["id"] for d in res.json()}

        res = self.client.post(
            "/api/datarooms/", {"name": "Invalide", "template_id": 999999},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 400)

        res = self.client.get("/api/datarooms/", HTTP_HOST=host)
        after = {d["id"] for d in res.json()}
        self.assertEqual(before, after)

    def test_non_manager_cannot_create_dataroom(self):
        # Régression explicite : créer une dataroom (avec ou sans template) est
        # réservé admin/superadmin, pas ouvert à tout membre de l'office.
        host = self._host()

        self.client.force_login(self.membre_user)
        res = self.client.post(
            "/api/datarooms/", {"name": "Refusé"}, content_type="application/json", HTTP_HOST=host
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_login(self.client_user)
        res = self.client.post(
            "/api/datarooms/", {"name": "Refusé aussi"}, content_type="application/json", HTTP_HOST=host
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_login(self.admin_user)
        res = self.client.post(
            "/api/datarooms/", {"name": "Autorisé"}, content_type="application/json", HTTP_HOST=host
        )
        self.assertEqual(res.status_code, 201)


class HyperadminTests(unittest.TestCase):
    """Teste l'interface hyperadmin (01/09/2026, voir CLAUDE.md, "État réel du
    code") : le rôle HyperadminAccess est TRANSVERSE à tous les offices, distinct
    du rôle "superadmin" d'OfficeMembership (scopé à un office précis) — le gate
    (_is_hyperadmin) ne dépend d'AUCUN request.office, les endpoints
    /api/hyperadmin/... sont donc appelés ici via le Host d'un office de CONTRÔLE
    qui n'est jamais celui testé.

    Particularité de ce chantier par rapport à PathVisibilityTests/
    RoleBasedDefaultAccessTests/DataroomTemplateTests : les tests eux-mêmes
    déclenchent la création de NOUVEAUX offices/tenants (c'est le comportement
    testé — POST /api/hyperadmin/offices/ provisionne une vraie base sqlite),
    donc setUp prépare un office de contrôle séparé, jamais créé PAR un test,
    et chaque test qui crée un office enregistre son subdomain pour un nettoyage
    commun en fin de test (fermeture de connexion avant unlink, requis sous
    Windows — même piège déjà documenté dans les classes précédentes)."""

    CONTROL_SUBDOMAIN = "hyperadmintest"

    def setUp(self):
        self.client = Client()

        self.control_alias = ensure_tenant_registered(self.CONTROL_SUBDOMAIN)
        call_command("migrate", database=self.control_alias, verbosity=0)
        control_db_path = tenant_db_path(self.CONTROL_SUBDOMAIN)

        def _cleanup_control_db():
            connections[self.control_alias].close()
            connections.databases.pop(self.control_alias, None)
            control_db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_control_db)

        self.control_office = Office.objects.create(
            subdomain=self.CONTROL_SUBDOMAIN, name="Hyperadmin Control Office"
        )
        self.addCleanup(self.control_office.delete)

        self.hyperadmin_user = User.objects.create_user(username="hat_hyperadmin", password="pw123456")
        self.addCleanup(self.hyperadmin_user.delete)
        HyperadminAccess.objects.create(user=self.hyperadmin_user)

        self.regular_user = User.objects.create_user(username="hat_regular", password="pw123456")
        self.addCleanup(self.regular_user.delete)
        OfficeMembership.objects.create(user=self.regular_user, office=self.control_office, role="admin")

        # Subdomains créés PAR les tests eux-mêmes (comportement testé) — purgés
        # en fin de test, impossible de les connaître à l'avance.
        self._created_office_subdomains = []
        self.addCleanup(self._cleanup_created_offices)

    def _cleanup_created_offices(self):
        for subdomain in self._created_office_subdomains:
            alias = tenant_alias(subdomain)
            if alias in connections.databases:
                connections[alias].close()
                connections.databases.pop(alias, None)
            tenant_db_path(subdomain).unlink(missing_ok=True)
        Office.objects.filter(subdomain__in=self._created_office_subdomains).delete()

    def _host(self):
        return f"{self.CONTROL_SUBDOMAIN}.localhost:8000"

    def test_whoami_exposes_the_hyperadmin_flag(self):
        """Le front a besoin de savoir s'il doit monter la console Notantis
        AVANT d'appeler quoi que ce soit sous /api/hyperadmin/ — sans ce
        drapeau, il ne lui reste qu'un 403 provoque exprès a chaque connexion,
        ou une entree de menu montree a tout le monde. Le rang est transverse :
        il ne depend pas de l'office du Host (ici l'office de controle, dont
        l'hyperadmin n'est meme pas membre)."""
        host = self._host()

        self.client.force_login(self.hyperadmin_user)
        res = self.client.get("/api/whoami/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["username"], "hat_hyperadmin")
        self.assertIs(res.json()["is_hyperadmin"], True)

        # Un admin d'office reste non-hyperadmin : le drapeau est present et
        # faux, pas absent — le front teste une valeur, pas une clef.
        self.client.force_login(self.regular_user)
        res = self.client.get("/api/whoami/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 200)
        self.assertIs(res.json()["is_hyperadmin"], False)

    def test_non_hyperadmin_gets_403_on_all_endpoints(self):
        # Un admin d'office "classique" (même role="admin"/"superadmin" sur son
        # office) n'est PAS hyperadmin — rôles distincts, voir HyperadminAccess.
        self.client.force_login(self.regular_user)
        host = self._host()

        res = self.client.get("/api/hyperadmin/offices/", HTTP_HOST=host)
        self.assertEqual(res.status_code, 403)

        res = self.client.post(
            "/api/hyperadmin/offices/",
            {
                "subdomain": "hatshouldnotexist", "name": "X",
                "admin_mode": "attach", "admin_username": "hat_regular",
            },
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Office.objects.filter(subdomain="hatshouldnotexist").exists())

        res = self.client.patch(
            f"/api/hyperadmin/offices/{self.control_office.id}/",
            {"is_active": False}, content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 403)

    def test_creating_office_provisions_tenant_database(self):
        self.client.force_login(self.hyperadmin_user)
        host = self._host()
        subdomain = "hatneword"
        self._created_office_subdomains.append(subdomain)

        res = self.client.post(
            "/api/hyperadmin/offices/",
            {
                "subdomain": subdomain, "name": "Nouvel Office",
                "admin_mode": "create", "admin_username": "hat_new_admin",
                "admin_password": "S3curePassw0rd!",
            },
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["subdomain"], subdomain)
        self.assertTrue(data["is_active"])
        self.addCleanup(lambda: User.objects.filter(username="hat_new_admin").delete())

        # Registre : l'office existe bien en base default, avec son premier
        # admin rattaché DANS LE MÊME FLUX (pas un second appel séparé).
        office = Office.objects.get(subdomain=subdomain)
        membership = OfficeMembership.objects.get(office=office)
        self.assertEqual(membership.user.username, "hat_new_admin")
        self.assertEqual(membership.role, "admin")

        # Base tenant réellement provisionnée : inspection DIRECTE du fichier
        # .sqlite3 (aucune dépendance au routeur/ORM pour la preuve), même
        # méthode que pour chaque modèle tenant précédent cette session.
        db_path = tenant_db_path(subdomain)
        self.assertTrue(db_path.exists())
        con = sqlite3.connect(db_path)
        try:
            tables = {
                row[0] for row in
                con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            }
        finally:
            con.close()
        self.assertIn("datarooms_dataroom", tables)
        self.assertIn("datarooms_template", tables)
        # Table partagée (base default) : ne doit PAS exister dans la base tenant.
        self.assertNotIn("datarooms_office", tables)

    def test_deactivated_office_becomes_inaccessible(self):
        self.client.force_login(self.hyperadmin_user)
        host = self._host()
        subdomain = "hatdeactivate"
        self._created_office_subdomains.append(subdomain)

        # Rattachement d'un compte EXISTANT (hat_regular) plutôt qu'une création
        # — varie le chemin par rapport au test précédent.
        res = self.client.post(
            "/api/hyperadmin/offices/",
            {
                "subdomain": subdomain, "name": "À désactiver",
                "admin_mode": "attach", "admin_username": "hat_regular",
            },
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        office_id = res.json()["id"]
        target_host = f"{subdomain}.localhost:8000"

        # Avant désactivation : hat_regular (maintenant admin de ce nouvel
        # office) y accède normalement.
        self.client.force_login(self.regular_user)
        res = self.client.get("/api/datarooms/", HTTP_HOST=target_host)
        self.assertEqual(res.status_code, 200)

        # Désactivation par le hyperadmin.
        self.client.force_login(self.hyperadmin_user)
        res = self.client.patch(
            f"/api/hyperadmin/offices/{office_id}/",
            {"is_active": False}, content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_active"])

        # Après désactivation : EXACTEMENT le même traitement qu'un sous-domaine
        # jamais enregistré (404 "sous-domaine d'office non résolu"), pas un
        # nouveau code d'erreur ad hoc — voir TenantResolutionMiddleware.
        self.client.force_login(self.regular_user)
        res = self.client.get("/api/datarooms/", HTTP_HOST=target_host)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["error"], "sous-domaine d'office non résolu")

    def test_hyperadmin_manages_enabled_modules(self):
        # Module vit dans la base default (SHARED_MODELS) — get_or_create plutôt
        # que create : la base de test peut être fraîche (migrations seules) OU,
        # en exécution isolée de cette seule classe, retomber sur la vraie base
        # de démo où seed_demo a déjà créé ce module (même slug).
        coffre_fort, created = Module.objects.get_or_create(
            slug="coffre-fort", defaults={"name": "Coffre-fort"}
        )
        if created:
            self.addCleanup(coffre_fort.delete)

        self.client.force_login(self.hyperadmin_user)
        host = self._host()
        subdomain = "hatmodules"
        self._created_office_subdomains.append(subdomain)

        res = self.client.post(
            "/api/hyperadmin/offices/",
            {
                "subdomain": subdomain, "name": "Modules",
                "admin_mode": "attach", "admin_username": "hat_regular",
            },
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 201)
        office_id = res.json()["id"]
        self.assertEqual(res.json()["enabled_modules"], [])

        res = self.client.patch(
            f"/api/hyperadmin/offices/{office_id}/",
            {"enabled_module_slugs": ["coffre-fort", "slug-inconnu"]},
            content_type="application/json", HTTP_HOST=host,
        )
        self.assertEqual(res.status_code, 200)
        # "coffre-fort" (créé par seed_demo, réutilisé ici) appliqué, le slug
        # inconnu silencieusement ignoré — pas d'erreur bloquante.
        self.assertEqual(res.json()["enabled_modules"], ["coffre-fort"])


class SearchApiTests(unittest.TestCase):
    """Teste GET /api/search/ — et surtout le point qui compte : une recherche ne
    doit JAMAIS servir de contournement aux AccessRestriction. Trouver le nom d'une
    pièce qu'on n'a pas le droit d'ouvrir est déjà une fuite, même sans son contenu.

    Même harnais que PathVisibilityTests (tenant sqlite dédié, `unittest.TestCase`,
    nettoyage manuel) — voir la longue note de cette classe pour la raison détaillée
    du choix de `unittest.TestCase` plutôt que `django.test.TestCase`.

    Arborescence construite dans setUp — tout contient « martin », pour que ce soit
    bien le contrôle d'accès et non le filtre par nom qui trie les résultats. Les tags
    posés (colonne de droite) servent la recherche par tag : « Vente » est porté par un
    dossier dont le NOM ne contient pas « vente » (c'est là tout l'intérêt) et par une
    pièce dont le nom le contient (pour vérifier qu'elle ne remonte pas deux fois) ;
    « Confidentiel » n'est porté que par des éléments restreints, pour vérifier qu'un
    tag n'ouvre aucun contournement :
        Succession Martin (pas de restriction)                    [Vente]
        ├── Actes Martin (pas de restriction)
        │    ├── acte-vente-martin.pdf   (pas de restriction)     [Vente]
        │    └── secret-martin.pdf       (restreint à {alice})    [Confidentiel]
        └── Prive Martin (restreint à {alice})
             └── note-martin.pdf         (pas de restriction propre → hérite) [Confidentiel]
    """

    SUBDOMAIN = "searchq"

    def setUp(self):
        self.client = Client()

        self.alias = ensure_tenant_registered(self.SUBDOMAIN)
        call_command("migrate", database=self.alias, verbosity=0)
        db_path = tenant_db_path(self.SUBDOMAIN)

        def _cleanup_tenant_db():
            connections[self.alias].close()
            connections.databases.pop(self.alias, None)
            db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_tenant_db)

        self.office = Office.objects.create(subdomain=self.SUBDOMAIN, name="Search Office")
        self.addCleanup(self.office.delete)

        self.alice = User.objects.create_user(username="searchq_alice", password="pw123456")
        self.addCleanup(self.alice.delete)
        OfficeMembership.objects.create(user=self.alice, office=self.office, role="membre")
        self.bob = User.objects.create_user(username="searchq_bob", password="pw123456")
        self.addCleanup(self.bob.delete)
        OfficeMembership.objects.create(user=self.bob, office=self.office, role="membre")
        # Volontairement SANS OfficeMembership : sert à vérifier le 403.
        self.etranger = User.objects.create_user(username="searchq_etranger", password="pw123456")
        self.addCleanup(self.etranger.delete)
        # Deux gestionnaires, pour la recherche de personnes : seul un gestionnaire en
        # obtient, et un admin ne doit pas voir les superadmins (même règle que
        # /api/office-users/, volontairement pas une seconde règle en parallèle).
        self.patronne = User.objects.create_user(username="searchq_patronne", password="pw123456")
        self.addCleanup(self.patronne.delete)
        OfficeMembership.objects.create(user=self.patronne, office=self.office, role="superadmin")
        self.gestionnaire = User.objects.create_user(username="searchq_gestion", password="pw123456")
        self.addCleanup(self.gestionnaire.delete)
        OfficeMembership.objects.create(user=self.gestionnaire, office=self.office, role="admin")

        token = set_current_tenant(TenantContext(self.SUBDOMAIN, self.alias))
        try:
            self.dataroom = Dataroom.objects.create(name="Succession Martin")
            self.actes = Folder.objects.create(dataroom=self.dataroom, parent=None, name="Actes Martin")
            self.acte_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.actes,
                name="acte-vente-martin.pdf", file="fake/acte.pdf",
            )
            self.secret_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.actes,
                name="secret-martin.pdf", file="fake/secret.pdf",
            )
            AccessRestriction.objects.create(document=self.secret_doc, user_ids=[self.alice.id])

            self.prive = Folder.objects.create(dataroom=self.dataroom, parent=None, name="Prive Martin")
            AccessRestriction.objects.create(folder=self.prive, user_ids=[self.alice.id])
            self.note_doc = Document.objects.create(
                dataroom=self.dataroom, folder=self.prive,
                name="note-martin.pdf", file="fake/note.pdf",
            )

            self.tag_vente = Tag.objects.create(name="Vente", slug="vente", color="brass")
            self.tag_confidentiel = Tag.objects.create(
                name="Confidentiel", slug="confidentiel", color="critical"
            )
            self.dataroom.tags.set([self.tag_vente])
            self.acte_doc.tags.set([self.tag_vente])
            self.secret_doc.tags.set([self.tag_confidentiel])
            self.note_doc.tags.set([self.tag_confidentiel])
        finally:
            reset_current_tenant(token)

    def _host(self):
        return f"{self.SUBDOMAIN}.localhost:8000"

    def _search(self, query):
        res = self.client.get("/api/search/", {"q": query}, HTTP_HOST=self._host())
        self.assertEqual(res.status_code, 200)
        return res.json()

    def _names(self, payload, kind=None):
        return {h["name"] for h in payload["results"] if kind is None or h["kind"] == kind}

    def test_member_without_restriction_finds_all_three_kinds(self):
        self.client.force_login(self.alice)
        payload = self._search("martin")
        self.assertEqual(self._names(payload, "dataroom"), {"Succession Martin"})
        self.assertEqual(self._names(payload, "folder"), {"Actes Martin", "Prive Martin"})
        self.assertEqual(
            self._names(payload, "document"),
            {"acte-vente-martin.pdf", "secret-martin.pdf", "note-martin.pdf"},
        )
        self.assertFalse(payload["truncated"])

    def test_search_never_reveals_a_restricted_document(self):
        # Le point central : bob cherche un terme qui matche TOUT, et ne doit
        # récupérer que ce qu'il pourrait déjà atteindre en cliquant.
        self.client.force_login(self.bob)
        payload = self._search("martin")
        self.assertEqual(self._names(payload, "document"), {"acte-vente-martin.pdf"})
        self.assertNotIn("secret-martin.pdf", self._names(payload))
        # Le dossier restreint et son contenu hérité disparaissent aussi.
        self.assertEqual(self._names(payload, "folder"), {"Actes Martin"})
        self.assertNotIn("note-martin.pdf", self._names(payload))

    def test_restricted_document_is_unreachable_even_by_its_exact_name(self):
        # Chercher le nom exact ne doit pas mieux marcher qu'un terme large : sans
        # ce test, une implémentation qui filtrerait "au mieux" passerait le test
        # précédent tout en confirmant l'existence de la pièce sur requête ciblée.
        self.client.force_login(self.bob)
        self.assertEqual(self._search("secret-martin.pdf")["results"], [])
        self.assertEqual(self._search("secret")["results"], [])

    def test_path_is_the_full_readable_chain(self):
        self.client.force_login(self.alice)
        payload = self._search("acte-vente")
        hit = next(h for h in payload["results"] if h["kind"] == "document")
        self.assertEqual(hit["path"], "Succession Martin / Actes Martin / acte-vente-martin.pdf")
        # `folder_id` désigne le dossier CONTENANT — c'est le niveau que l'interface
        # ouvre pour montrer la pièce, pas la pièce elle-même.
        self.assertEqual(hit["folder_id"], self.actes.id)
        self.assertEqual(hit["dataroom_id"], self.dataroom.id)

    def test_empty_query_returns_nothing(self):
        # Seul le vide (ou les espaces seuls) ne cherche rien : ouvrir la palette ne
        # doit pas lister tout l'office. Le seuil est à 1 depuis le 31/08/2026.
        self.client.force_login(self.alice)
        for query in ("", " ", "   "):
            payload = self._search(query)
            self.assertEqual(payload["results"], [], f"requête {query!r}")
            self.assertFalse(payload["truncated"])

    def test_single_character_query_already_searches(self):
        # Régression du comportement demandé : une seule lettre doit chercher.
        self.client.force_login(self.alice)
        payload = self._search("m")
        self.assertIn("Succession Martin", self._names(payload, "dataroom"))

    def test_match_is_on_word_start_not_anywhere_inside(self):
        # Régression du 31/08/2026 : « e » ramenait « Succession Martin » (le « e »
        # de Succession) — la palette devenait inutilisable dès la première lettre.
        self.client.force_login(self.alice)
        self.assertNotIn("Succession Martin", self._names(self._search("e")))
        # Mais le début d'un mot INTERNE doit continuer à marcher, sinon il faudrait
        # connaître le premier mot du nom pour retrouver quoi que ce soit.
        self.assertIn("Succession Martin", self._names(self._search("mar")))
        self.assertIn("Actes Martin", self._names(self._search("mar"), "folder"))

    def test_word_start_also_applies_after_a_dash_or_a_dot(self):
        # Les noms de pièces séparent leurs mots autrement que par des espaces : la
        # classe de séparateurs est définie en négatif justement pour ça.
        self.client.force_login(self.alice)
        self.assertIn("acte-vente-martin.pdf", self._names(self._search("vente")))
        self.assertIn("acte-vente-martin.pdf", self._names(self._search("pdf")))

    def test_manager_finds_the_people_of_the_office(self):
        self.client.force_login(self.patronne)
        # « alice » trouve « searchq_alice » : l'underscore est un séparateur comme un
        # autre, donc « alice » y est bien un début de mot.
        self.assertIn("searchq_alice", self._names(self._search("alice"), "person"))

    def test_ordinary_member_gets_no_person_but_keeps_searching_content(self):
        # Un membre sans rôle de gestion ne doit voir personne — sans que ça lui coupe
        # la recherche de ses propres dossiers (d'où un filtrage et non un 403 global).
        self.client.force_login(self.bob)
        self.assertEqual(self._names(self._search("alice"), "person"), set())
        self.assertIn(
            "acte-vente-martin.pdf", self._names(self._search("acte-vente"), "document")
        )

    def test_admin_does_not_find_superadmin_people(self):
        # Même visibilité hiérarchique que /api/office-users/ : un admin (rang 2) ne
        # voit pas les superadmins (rang 3). La recherche ne doit pas être la porte
        # dérobée qui confirme leur existence.
        self.client.force_login(self.gestionnaire)
        names = self._names(self._search("searchq"), "person")
        self.assertIn("searchq_alice", names)
        self.assertNotIn("searchq_patronne", names)

    def test_a_tag_finds_what_carries_it_even_when_the_name_says_nothing(self):
        # Le cœur de la fonctionnalité : « Succession Martin » ne contient pas
        # « vente », c'est son TAG qui correspond. Sans ce passage, le dossier serait
        # introuvable autrement qu'en sachant déjà comment il s'appelle.
        self.client.force_login(self.alice)
        hits = [h for h in self._search("vente")["results"] if h["kind"] == "dataroom"]
        self.assertEqual([h["name"] for h in hits], ["Succession Martin"])
        self.assertEqual(hits[0]["matched_tag"]["name"], "Vente")

    def test_a_result_found_by_its_name_carries_no_tag_justification(self):
        # `matched_tag` répond à « pourquoi cet élément remonte-t-il ? ». Sur une
        # correspondance par nom la question ne se pose pas, et une pastille de tag
        # affichée là ferait croire à une correspondance qui n'a pas eu lieu.
        self.client.force_login(self.alice)
        hits = [
            h for h in self._search("martin")["results"]
            if h["kind"] == "dataroom" and h["name"] == "Succession Martin"
        ]
        self.assertEqual(len(hits), 1)
        self.assertIsNone(hits[0]["matched_tag"])

    def test_an_element_matching_by_both_name_and_tag_appears_once(self):
        # « acte-vente-martin.pdf » porte le tag « Vente » ET « vente » dans son nom.
        # Le nom l'emporte : un seul résultat, sans justification par tag.
        self.client.force_login(self.alice)
        hits = [
            h for h in self._search("vente")["results"]
            if h["kind"] == "document" and h["name"] == "acte-vente-martin.pdf"
        ]
        self.assertEqual(len(hits), 1)
        self.assertIsNone(hits[0]["matched_tag"])

    def test_a_tag_is_never_a_way_around_a_restriction(self):
        # Le point qui compte, transposé aux tags : « Confidentiel » n'est porté que
        # par une pièce restreinte à alice et par une pièce d'un dossier restreint à
        # alice. Bob ne doit rien en apprendre — ni le nom, ni l'existence.
        self.client.force_login(self.bob)
        self.assertEqual(self._search("confidentiel")["results"], [])
        # Et le tag ne rend pas trouvable non plus la pièce dont l'accès est hérité.
        self.assertEqual(self._names(self._search("confidentiel")), set())

        # Contre-épreuve : alice, elle, les trouve bien par ce tag — sinon le test
        # ci-dessus passerait aussi avec une recherche par tag cassée.
        self.client.force_login(self.alice)
        self.assertEqual(
            self._names(self._search("confidentiel"), "document"),
            {"secret-martin.pdf", "note-martin.pdf"},
        )

    def test_tag_match_is_word_start_like_names(self):
        # Même règle que pour les noms (voir _name_starts_with), pas une seconde
        # sémantique à retenir : « vent » trouve « Vente », « ente » ne trouve rien.
        self.client.force_login(self.alice)
        self.assertIn("Succession Martin", self._names(self._search("vent"), "dataroom"))
        self.assertEqual(self._names(self._search("ente"), "dataroom"), set())

    def test_a_tag_on_the_dataroom_does_not_pull_up_its_content(self):
        # « Vente » est posé sur le dossier, pas sur « Prive Martin » ni sur
        # « note-martin.pdf ». Remonter tout le contenu d'un dossier étiqueté noierait
        # la palette et répondrait à une question de navigation, pas de recherche.
        self.client.force_login(self.alice)
        names = self._names(self._search("vente"))
        self.assertNotIn("Prive Martin", names)
        self.assertNotIn("note-martin.pdf", names)

    def test_regex_metacharacters_in_the_query_are_escaped(self):
        # Une frappe passe par des motifs incomplets (« ( », « [ ») : le serveur doit
        # les traiter comme du texte et répondre vide, pas planter en 500.
        self.client.force_login(self.alice)
        for query in ("(", "[", ".*", "\\"):
            res = self.client.get("/api/search/", {"q": query}, HTTP_HOST=self._host())
            self.assertEqual(res.status_code, 200, f"requête {query!r}")
            self.assertEqual(res.json()["results"], [], f"requête {query!r}")

    def test_non_member_of_the_office_is_forbidden(self):
        self.client.force_login(self.etranger)
        res = self.client.get("/api/search/", {"q": "martin"}, HTTP_HOST=self._host())
        self.assertEqual(res.status_code, 403)

    def test_anonymous_is_rejected(self):
        res = self.client.get("/api/search/", {"q": "martin"}, HTTP_HOST=self._host())
        self.assertIn(res.status_code, (401, 403))


class TagValidatorTests(TestCase):
    """Repliage du nom et bornes du payload — la partie de la logique des tags qui
    ne demande ni base tenant ni requête HTTP."""

    def test_slug_folds_case_and_accents(self):
        # C'est ce repliage qui empêche « Copropriété », « copropriete » et
        # « COPROPRIETE » de devenir trois entrées du catalogue.
        self.assertEqual(tag_slug("Copropriété"), tag_slug("copropriete"))
        self.assertEqual(tag_slug("COPROPRIETE"), tag_slug("Copropriété"))
        self.assertEqual(tag_slug("Vente  immobilière"), "vente-immobiliere")

    def test_slug_of_a_non_latin_name_is_not_empty(self):
        # Sans le repli final, un nom entièrement non-latin donnerait une chaîne
        # vide — et TOUS ces tags seraient alors le même (slug unique en base).
        self.assertNotEqual(tag_slug("契約"), "")
        self.assertNotEqual(tag_slug("契約"), tag_slug("譲渡"))

    def test_name_is_collapsed_and_required(self):
        self.assertEqual(clean_tag_payload({"name": "  Vente   ferme "})["name"], "Vente ferme")
        with self.assertRaises(TagValidationError):
            clean_tag_payload({"name": "   "})
        with self.assertRaises(TagValidationError):
            clean_tag_payload({"name": "x" * 61})

    def test_color_defaults_and_is_bounded(self):
        self.assertEqual(clean_tag_payload({"name": "Vente"})["color"], "brass")
        with self.assertRaises(TagValidationError):
            clean_tag_payload({"name": "Vente", "color": "#7c3aed"})

    def test_partial_payload_returns_only_what_was_sent(self):
        self.assertEqual(clean_tag_payload({"color": "info"}, partial=True), {"color": "info"})


class TagRouterTests(TestCase):
    """Tag et ses deux tables pivot doivent rester des modèles TENANT.

    Contre-exemple à garder en tête : `office_enabled_modules` est, lui, partagé —
    parce qu'il relie deux modèles partagés. Ici les deux extrémités sont tenant, donc
    la table pivot l'est aussi, et rien ne doit apparaître dans SHARED_MODELS.
    """

    def setUp(self):
        self.router = TenantRouter()

    def test_tag_is_a_tenant_model_not_shared(self):
        self.assertFalse(self.router.allow_migrate("default", "datarooms", "tag"))
        self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", "tag"))

    def test_tag_pivot_tables_are_tenant_tables(self):
        for table in ("dataroom_tags", "document_tags"):
            with self.subTest(table=table):
                self.assertFalse(self.router.allow_migrate("default", "datarooms", table))
                self.assertTrue(self.router.allow_migrate("tenant_officea", "datarooms", table))


class TagApiTests(unittest.TestCase):
    """Catalogue de tags et affectation — /api/tags/, /api/datarooms/<id>/tags/,
    /api/datarooms/<id>/documents/<id>/tags/.

    Même montage que PathVisibilityApiTests (voir sa docstring pour le pourquoi de
    `unittest.TestCase` plutôt que `django.test.TestCase`) : tenant sqlite dédié,
    migré explicitement, supprimé à chaque test.
    """

    SUBDOMAIN = "tagtest"

    def setUp(self):
        self.client = Client()

        self.alias = ensure_tenant_registered(self.SUBDOMAIN)
        call_command("migrate", database=self.alias, verbosity=0)
        db_path = tenant_db_path(self.SUBDOMAIN)

        def _cleanup_tenant_db():
            connections[self.alias].close()
            connections.databases.pop(self.alias, None)
            db_path.unlink(missing_ok=True)

        self.addCleanup(_cleanup_tenant_db)

        self.office = Office.objects.create(subdomain=self.SUBDOMAIN, name="Tag Office")
        self.addCleanup(self.office.delete)

        self.admin = User.objects.create_user(username="tag_admin", password="pw123456")
        self.addCleanup(self.admin.delete)
        OfficeMembership.objects.create(user=self.admin, office=self.office, role="admin")

        self.membre = User.objects.create_user(username="tag_membre", password="pw123456")
        self.addCleanup(self.membre.delete)
        OfficeMembership.objects.create(user=self.membre, office=self.office, role="membre")

        token = set_current_tenant(TenantContext(self.SUBDOMAIN, self.alias))
        try:
            self.vente = Dataroom.objects.create(name="Vente Caudan")
            self.succession = Dataroom.objects.create(name="Succession Hamon")
            self.doc = Document.objects.create(
                dataroom=self.vente, folder=None, name="acte.pdf", file="fake/acte.pdf"
            )
        finally:
            reset_current_tenant(token)

    def _host(self):
        return f"{self.SUBDOMAIN}.localhost:8000"

    def _post(self, path, payload):
        return self.client.post(
            path, data=json.dumps(payload), content_type="application/json", HTTP_HOST=self._host()
        )

    def _put(self, path, payload):
        return self.client.put(
            path, data=json.dumps(payload), content_type="application/json", HTTP_HOST=self._host()
        )

    def _create_tag(self, name, color="brass"):
        res = self._post("/api/tags/", {"name": name, "color": color})
        self.assertIn(res.status_code, (200, 201), res.content)
        return res.json()

    # --- catalogue -------------------------------------------------------

    def test_a_membre_can_create_a_tag_on_the_fly(self):
        # Le droit de création est volontairement large : sans lui, le tagging
        # meurt d'attendre un admin.
        self.client.force_login(self.membre)
        res = self._post("/api/tags/", {"name": "Prioritaire", "color": "critical"})
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["name"], "Prioritaire")
        self.assertEqual(res.json()["color"], "critical")

    def test_creating_an_existing_name_returns_the_existing_tag(self):
        self.client.force_login(self.membre)
        first = self._create_tag("Vente", color="brass")
        res = self._post("/api/tags/", {"name": "VENTE", "color": "info"})
        # 200 et pas 201 : le front distingue « ajouté au catalogue » de
        # « existait déjà » sans second appel.
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.json()["id"], first["id"])
        # La couleur de l'existant n'est pas écrasée : deux membres qui tapent le
        # même mot ne doivent pas se voler la couleur à tour de rôle.
        self.assertEqual(res.json()["color"], "brass")

    def test_catalog_reports_usage_across_datarooms_and_documents(self):
        self.client.force_login(self.membre)
        tag = self._create_tag("Vente")
        self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [tag["id"]]})
        self._put(
            f"/api/datarooms/{self.vente.id}/documents/{self.doc.id}/tags/", {"tags": [tag["id"]]}
        )
        listing = self.client.get("/api/tags/", HTTP_HOST=self._host()).json()
        self.assertEqual([t["usage"] for t in listing if t["id"] == tag["id"]], [2])

    def test_only_an_admin_can_rename_or_delete(self):
        self.client.force_login(self.membre)
        tag = self._create_tag("Vente")
        patch = self.client.patch(
            f"/api/tags/{tag['id']}/",
            data=json.dumps({"name": "Cession"}),
            content_type="application/json",
            HTTP_HOST=self._host(),
        )
        self.assertEqual(patch.status_code, 403, patch.content)
        self.assertEqual(
            self.client.delete(f"/api/tags/{tag['id']}/", HTTP_HOST=self._host()).status_code, 403
        )

        self.client.force_login(self.admin)
        patch = self.client.patch(
            f"/api/tags/{tag['id']}/",
            data=json.dumps({"name": "Cession"}),
            content_type="application/json",
            HTTP_HOST=self._host(),
        )
        self.assertEqual(patch.status_code, 200, patch.content)
        self.assertEqual(patch.json()["name"], "Cession")

    def test_renaming_onto_an_existing_name_is_refused(self):
        # Accepter fusionnerait deux entrées du catalogue sans le dire.
        self.client.force_login(self.admin)
        self._create_tag("Vente")
        other = self._create_tag("Succession")
        res = self.client.patch(
            f"/api/tags/{other['id']}/",
            data=json.dumps({"name": "vente"}),
            content_type="application/json",
            HTTP_HOST=self._host(),
        )
        self.assertEqual(res.status_code, 409, res.content)

    def test_deleting_a_tag_removes_it_from_the_datarooms_that_carried_it(self):
        self.client.force_login(self.admin)
        tag = self._create_tag("Vente")
        self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [tag["id"]]})
        self.assertEqual(
            self.client.delete(f"/api/tags/{tag['id']}/", HTTP_HOST=self._host()).status_code, 204
        )
        rows = self.client.get("/api/datarooms/", HTTP_HOST=self._host()).json()
        self.assertEqual([r["tags"] for r in rows if r["id"] == self.vente.id], [[]])

    # --- affectation et filtre -------------------------------------------

    def test_tags_survive_the_round_trip_on_a_dataroom(self):
        self.client.force_login(self.membre)
        vente = self._create_tag("Vente", color="brass")
        urgent = self._create_tag("Urgent", color="critical")
        res = self._put(
            f"/api/datarooms/{self.vente.id}/tags/", {"tags": [vente["id"], urgent["id"]]}
        )
        self.assertEqual(res.status_code, 200, res.content)
        rows = self.client.get("/api/datarooms/", HTTP_HOST=self._host()).json()
        names = [t["name"] for r in rows if r["id"] == self.vente.id for t in r["tags"]]
        # Ordre alphabétique (Tag.Meta.ordering) : la colonne « Tags » ne doit pas
        # changer d'ordre d'un rafraîchissement à l'autre.
        self.assertEqual(names, ["Urgent", "Vente"])

    def test_put_replaces_the_whole_selection(self):
        self.client.force_login(self.membre)
        vente = self._create_tag("Vente")
        urgent = self._create_tag("Urgent")
        self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [vente["id"], urgent["id"]]})
        self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [urgent["id"]]})
        rows = self.client.get("/api/datarooms/", HTTP_HOST=self._host()).json()
        names = [t["name"] for r in rows if r["id"] == self.vente.id for t in r["tags"]]
        self.assertEqual(names, ["Urgent"])

    def test_filter_is_an_or_across_the_selected_tags(self):
        self.client.force_login(self.membre)
        vente = self._create_tag("Vente")
        succession = self._create_tag("Succession")
        self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [vente["id"]]})
        self._put(f"/api/datarooms/{self.succession.id}/tags/", {"tags": [succession["id"]]})

        one = self.client.get(f"/api/datarooms/?tags={vente['id']}", HTTP_HOST=self._host()).json()
        self.assertEqual([r["id"] for r in one], [self.vente.id])

        both = self.client.get(
            f"/api/datarooms/?tags={vente['id']},{succession['id']}", HTTP_HOST=self._host()
        ).json()
        # Cocher un deuxième tag ÉLARGIT la vue (OU) — un ET la viderait ici.
        self.assertEqual(sorted(r["id"] for r in both), sorted([self.vente.id, self.succession.id]))

    def test_an_unreadable_filter_returns_nothing_rather_than_everything(self):
        # « ?tags=abc » ne doit pas se comporter comme « pas de filtre » : une liste
        # vide dit que le filtre a joué, une liste complète ferait croire à une panne.
        self.client.force_login(self.membre)
        res = self.client.get("/api/datarooms/?tags=abc", HTTP_HOST=self._host()).json()
        self.assertEqual(res, [])

    def test_an_unknown_tag_id_is_refused(self):
        # Un id valide dans l'office voisin ne doit pas passer en silence — même
        # règle que _resolve_folder pour un dossier d'une autre dataroom.
        self.client.force_login(self.membre)
        res = self._put(f"/api/datarooms/{self.vente.id}/tags/", {"tags": [999999]})
        self.assertEqual(res.status_code, 400, res.content)

    def test_document_tags_survive_the_round_trip(self):
        self.client.force_login(self.membre)
        signe = self._create_tag("Signé", color="success")
        res = self._put(
            f"/api/datarooms/{self.vente.id}/documents/{self.doc.id}/tags/", {"tags": [signe["id"]]}
        )
        self.assertEqual(res.status_code, 200, res.content)
        level = self.client.get(
            f"/api/datarooms/{self.vente.id}/folders/", HTTP_HOST=self._host()
        ).json()
        self.assertEqual(
            [t["name"] for d in level["documents"] if d["id"] == self.doc.id for t in d["tags"]],
            ["Signé"],
        )

    def test_a_dataroom_can_be_created_with_tags(self):
        # self.admin, pas self.membre : POST /api/datarooms/ est réservé
        # admin/superadmin depuis la fusion du 01/09/2026 (chantier Templates,
        # voir CLAUDE.md) — sans rapport avec les tags, seul le rôle de
        # l'appelant change ici par rapport à la version d'origine du test.
        self.client.force_login(self.admin)
        tag = self._create_tag("Vente")
        res = self._post("/api/datarooms/", {"name": "Nouveau dossier", "tags": [tag["id"]]})
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual([t["name"] for t in res.json()["tags"]], ["Vente"])

    def test_a_non_member_gets_nothing(self):
        etranger = User.objects.create_user(username="tag_etranger", password="pw123456")
        self.addCleanup(etranger.delete)
        self.client.force_login(etranger)
        self.assertEqual(self.client.get("/api/tags/", HTTP_HOST=self._host()).status_code, 403)
