"""Modèles de dataroom (Template/TemplateFolder) de démo.

Recrée en vraies données ce que la maquette front figée `DATAROOM_TEMPLATES`
(`frontend/src/data/demo.tsx`, retirée le 02/09/2026 — voir CLAUDE.md) ne
faisait qu'illustrer : mêmes intitulés et mêmes idées ("14 rubriques ·
diagnostics, urbanisme, fiscalité…", "Groupes Conjoint 1 / Conjoint 2 /
Magistrats"), mais de vrais `Template`/`TemplateFolder` en base, applicables
pour de bon à la création d'une dataroom.

L'arborescence de « Vente immobilière — standard » (14 rubriques + leurs
sous-rubriques) est reprise telle quelle de l'Annexe A de
`EN_vision_AMOA_MVP_v0.5_fusionne.md` — une arborescence de dataroom réelle
anonymisée, citée là-bas comme illustration du besoin de "templates
d'arborescence" (§4.6). Un seul niveau de sous-dossiers (pas les
sous-sous-dossiers ni les documents individuels de l'annexe, hors de portée
d'un TemplateFolder) suffit à donner corps à la description de la maquette
d'origine.

    python manage.py seed_templates

Idempotent (get_or_create par nom de Template) et volontairement hardcodé sur
officea/officeb — même patron que seed_demo, pas de --office comme
seed_office_content : ce sont les deux seuls offices de démo du POC.
"""

from django.core.management.base import BaseCommand

from datarooms.models import Office, Template, TemplateFolder
from datarooms.tenancy.context import TenantContext, reset_current_tenant, set_current_tenant
from datarooms.tenancy.registry import ensure_tenant_registered, tenant_alias

VENTE_IMMOBILIERE = {
    "name": "Vente immobilière — standard",
    "description": "14 rubriques · diagnostics, urbanisme, fiscalité…",
    "folders": {
        "Aspects sociétaires": ["Société A", "Société B"],
        "Présentation de l'actif": ["Plans", "Note de désignation"],
        "Droit de propriété": ["Titre immédiat", "Titres antérieurs", "Origine de propriété"],
        "Situation hypothécaire": ["Fiche personnelle", "Fiche immeuble", "Fiche réelle"],
        "Servitudes": ["Actes constitutifs", "Note sur les servitudes"],
        "Organisation juridique": [],
        "Urbanisme": ["Documents d'urbanisme", "Cadastre", "PLU", "DPU"],
        "Autorisations administratives": [
            "Autorisation de construction", "Établissements Recevant du Public", "CDEC - CDAC Publicité",
        ],
        "Assurances": ["Assurances propriétaire", "Assurances construction"],
        "Diagnostics": [
            "Amiante", "DPE", "Termites", "Mérules", "Assainissement", "État des Risques", "Radon",
        ],
        "Environnement": [
            "ICPE", "Base de données", "Géorisques", "ERRIAL", "ERPS", "Étude environnementale",
        ],
        "Situation locative": [
            "Bail commercial", "Avenant au bail commercial", "Demande de renouvellement locataire",
            "Correspondance locative", "Acte de cession de fonds de commerce",
            "Acte de cession de parts sociales", "Contrat de domiciliation", "Caution bancaire",
            "Attestation d'assurance locataire", "Quittances - Loyers", "Charges",
        ],
        "Technique": ["Installations techniques"],
        "Fiscalité": ["Taxe foncière", "Option TVA", "Libellé Révision valeur locative (rev-k)"],
    },
}

# La maquette d'origine ne suggérait rien de plus précis que ces trois groupes
# — aucun sous-dossier inventé au-delà de ce qu'elle décrivait.
DIVORCE = {
    "name": "Dossier de divorce",
    "description": "Groupes Conjoint 1 / Conjoint 2 / Magistrats",
    "folders": {
        "Conjoint 1": [],
        "Conjoint 2": [],
        "Magistrats": [],
    },
}

TEMPLATES = [VENTE_IMMOBILIERE, DIVORCE]


class Command(BaseCommand):
    help = "Crée les modèles de dataroom de démo (Template/TemplateFolder) pour officea et officeb."

    def handle(self, *args, **options):
        for subdomain in ("officea", "officeb"):
            if not Office.objects.filter(subdomain=subdomain).exists():
                self.stdout.write(self.style.WARNING(
                    f"Office '{subdomain}' introuvable — lancer seed_demo d'abord ?"
                ))
                continue
            self._seed_office(subdomain)

        self.stdout.write(self.style.SUCCESS("Modèles de démo créés (officea, officeb)."))

    def _seed_office(self, subdomain):
        # Sans ce contexte, le routeur ne sait pas dans quelle base écrire (il
        # lève MissingTenantContext) — Template/TemplateFolder sont des modèles
        # tenant, même patron que seed_office_content.
        ensure_tenant_registered(subdomain)
        token = set_current_tenant(TenantContext(subdomain=subdomain, alias=tenant_alias(subdomain)))
        try:
            for plan in TEMPLATES:
                template, created = Template.objects.get_or_create(
                    name=plan["name"], defaults={"description": plan["description"]}
                )
                if not created:
                    self.stdout.write(f"[{subdomain}] « {plan['name']} » existe déjà — ignoré.")
                    continue
                for top_name, sub_names in plan["folders"].items():
                    top = TemplateFolder.objects.create(template=template, parent=None, name=top_name)
                    for sub_name in sub_names:
                        TemplateFolder.objects.create(template=template, parent=top, name=sub_name)
                self.stdout.write(f"[{subdomain}] « {plan['name']} » créé.")
        finally:
            reset_current_tenant(token)
