import re

from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth.models import User

from .tenancy.storage import tenant_document_path

# Create your models here.
class Module(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Office(models.Model):
    # "hyperadmin" est réservé au sous-domaine dédié de l'interface hyperadmin
    # (frontend/src/hyperadmin/, TenantResolutionMiddleware) — jamais un Office
    # réel. Bloqué ici (clean(), appelé par full_clean() aussi bien depuis
    # hyperadmin_offices_view que depuis /admin/ Django) pour qu'aucun des deux
    # points de création ne puisse créer la collision.
    RESERVED_SUBDOMAINS = {"hyperadmin"}

    # SlugField (validate_slug) accepte l'underscore — un vrai nom de domaine ne
    # le peut pas (RFC 1034/1035), et Django lui-même l'applique sans exception
    # possible : HttpRequest.get_host() rejette tout Host contenant un underscore
    # AVANT même ALLOWED_HOSTS (host_validation_re, django/http/request.py,
    # hors de portée d'un réglage), avec un 500 DisallowedHost — pas un 4xx
    # applicatif lisible. Rencontré en réel le 04/09/2026 avec un office
    # "max_test" créé depuis la console hyperadmin : `SlugField.full_clean()`
    # l'avait laissé passer, l'office existait bien en base, mais son
    # sous-domaine ne pouvait plus jamais être atteint — ni CORS ni ALLOWED_HOSTS
    # n'auraient pu compenser. SUBDOMAIN_RE resserre donc DÈS LA VALIDATION DU
    # MODÈLE à ce que Django (et un vrai DNS) accepteront réellement, avant que
    # le problème ne devienne visible seulement une fois l'office créé — voir
    # docs/journal.md pour le détail.
    SUBDOMAIN_RE = re.compile(r"^[a-z0-9-]+$")

    subdomain = models.SlugField(unique=True)  # "officea"
    name = models.CharField(max_length=255)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1a56db")
    enabled_modules = models.ManyToManyField(Module, blank=True, related_name="offices")
    is_active = models.BooleanField(default=True)
    # Un office désactivé devient inaccessible EXACTEMENT comme un sous-domaine
    # inconnu (tenancy/middleware.py : TenantResolutionMiddleware ne pose ni
    # request.office ni le contexte tenant si is_active=False) — pas de
    # suppression de données, juste un accès coupé. Bascule depuis l'interface
    # hyperadmin (views.hyperadmin_office_detail_view), pas /admin/.
    theme = models.JSONField(null=True, blank=True)
    # Personnalisation visuelle de l'office : couleurs par thème clair/sombre,
    # preset typographique, preset de formes. Forme attendue :
    #   {"colors": {"light": {"bg": "#fafafd", ...}, "dark": {...}},
    #    "typography": "classique", "shape": "equilibre"}
    #
    # Le schéma des tokens vit côté front (frontend/src/theme/schema.ts) et n'est
    # volontairement PAS dupliqué ici : une couleur ajoutée au design system ne
    # doit pas imposer une migration. Le backend stocke et borne (voir
    # validators.clean_theme_payload), le front valide le contenu à la lecture
    # (normalizeThemeState) et complète ce qui manque par ses valeurs par défaut.
    #
    # null = cet office n'a jamais rien personnalisé — l'API répond alors 204 et
    # le front applique les valeurs Notantis d'origine.

    def clean(self):
        if self.subdomain in self.RESERVED_SUBDOMAINS:
            raise ValidationError({"subdomain": "réservé à l'interface hyperadmin"})
        if self.subdomain and not self.SUBDOMAIN_RE.match(self.subdomain):
            raise ValidationError(
                {"subdomain": "lettres minuscules, chiffres et tirets uniquement (pas d'underscore)"}
            )

    def __str__(self):
        return self.name

class OfficeMembership(models.Model):
    ROLE_CHOICES = [
        ("superadmin", "Superadmin"),
        ("admin", "Admin"),
        ("membre", "Membre"),
        ("client", "Client"),
    ]
    # Ordre hiérarchique explicite (plus haut = plus privilégié), défini une seule fois
    # ici plutôt que via des comparaisons de chaînes éparpillées dans les vues. Utilisé
    # pour la visibilité/gestion des rôles par les admins d'office (un admin ne doit ni
    # voir ni gérer les memberships superadmin de son office, ni en créer) — voir
    # CLAUDE.md, "État réel du code".
    ROLE_RANK = {"superadmin": 3, "admin": 2, "membre": 1, "client": 0}
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    office = models.ForeignKey(Office, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="membre")
    dashboard = models.JSONField(null=True, blank=True)
    # Disposition personnalisée de l'écran d'accueil pour CE membre dans CET office.
    # Forme attendue — une liste d'ONGLETS, chacun étant un écran complet :
    #   {"template": "notaire",
    #    "pages": [{"id": "notaire-1", "name": "Vue d'ensemble",
    #               "widgets": [{"id": "dossiers-actifs", "x": 0, "y": 0, "w": 3, "h": 2}, ...]}]}
    #
    # Les dispositions écrites avant les onglets ont la forme {"template", "widgets"}
    # et sont converties en un onglet unique à l'écriture suivante — voir
    # validators.clean_dashboard_payload. Rien à migrer : la lecture les tolère.
    #
    # Porté par le membership plutôt que par un modèle dédié parce que la clé
    # métier est exactement (user, office) — celle que `unique_together` garantit
    # déjà. Un DashboardLayout séparé aurait dupliqué cette contrainte et exigé
    # d'être ajouté à SHARED_MODELS du routeur ; ici il n'y a rien à router de
    # plus, le membership est déjà un modèle partagé (base "default").
    #
    # Le catalogue des widgets et celui des templates vivent côté front
    # (frontend/src/dashboard/registry.tsx et templates.ts), exactement comme le
    # schéma de tokens pour Office.theme : ajouter un widget ne doit imposer ni
    # migration ni déploiement backend. Le serveur stocke et BORNE la forme
    # (validators.clean_dashboard_payload), le front ignore à la lecture les
    # widgets qu'il ne connaît plus.
    #
    # null = ce membre n'a jamais rien réorganisé — l'API répond 204 et le front
    # applique le template déduit du rôle.

    class Meta:
        unique_together = ("user", "office")

    def __str__(self):
        return f"{self.user} @ {self.office} ({self.role})"

class HyperadminAccess(models.Model):
    """Marque un utilisateur comme hyperadmin Notantis — rôle TRANSVERSE à tous
    les offices, distinct du rôle "superadmin" d'OfficeMembership (qui reste
    scopé à UN office précis, même pour un utilisateur superadmin sur plusieurs
    offices comme carla). Vit dans la base default (ajouté à SHARED_MODELS,
    tenancy/router.py) : l'existence d'une ligne pour un utilisateur donné
    signifie qu'il est hyperadmin, peu importe le sous-domaine depuis lequel il
    se connecte (voir views._is_hyperadmin, gate des routes /api/hyperadmin/...,
    indépendant de request.office). Volontairement PAS is_staff/is_superuser
    Django (portée /admin/ différente, pas d'API applicative dédiée) ni le rôle
    "superadmin" d'OfficeMembership (scopé à un office)."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="hyperadmin_access")

    def __str__(self):
        return f"Hyperadmin: {self.user}"

class Tag(models.Model):
    """Cinquième modèle métier tenant (fait le 01/09/2026) — même patron que
    Dataroom/Folder/Document/AccessRestriction : vit dans la base de l'office, absent de
    SHARED_MODELS par conception (voir tenancy/router.py). C'est donc le CATALOGUE DE
    TAGS DE L'OFFICE : deux offices peuvent avoir un tag « Vente » sans aucun rapport
    l'un avec l'autre, et `slug` n'a besoin d'être unique que dans la base tenant — pas
    de colonne `office_id` à porter, l'isolation est physique.

    `slug` est dérivé du nom à la création et sert de clé de déduplication : re-créer
    « Vente » alors que « vente » existe déjà renvoie le tag existant plutôt qu'un
    doublon (voir views._get_or_create_tag) — c'est ce qui rend la création à la volée
    depuis un dossier sûre sans imposer un catalogue verrouillé.

    `color` est une CLÉ SÉMANTIQUE (« brass », « info », « success »…), pas un
    hexadécimal : la couleur réellement affichée est celle du thème de l'office, résolue
    côté front via les tokens CSS (voir frontend/src/components/atoms/Tag.tsx). Un office
    qui personnalise sa palette voit ses tags suivre, ce qu'un `#7c3aed` figé en base
    empêcherait. L'ensemble fermé des clés vit dans validators.TAG_COLORS.

    Les M2M vers Dataroom et Document sont déclarés côté Dataroom/Document (pas ici) et
    leurs tables pivot implicites sont, comme leurs deux extrémités, des tables tenant —
    rien à ajouter à SHARED_MODELS, contrairement à office_enabled_modules qui relie deux
    modèles partagés.
    """
    name = models.CharField(max_length=60)
    slug = models.SlugField(max_length=80, unique=True)
    color = models.CharField(max_length=20, default="brass")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Dataroom(models.Model):
    """Modèle métier tenant : vit dans la base de l'office (tenant_<subdomain>), pas
    dans la base default. Volontairement pas de ForeignKey vers Office — l'office est
    déjà déterminé par le fichier SQLite dans lequel cette ligne est stockée (voir
    tenancy/router.py) ; une vraie FK cross-DB n'est de toute façon pas possible avec
    ce mécanisme. Un seul type de dataroom (pas de distinction électronique / espace
    de travail / dossier de divorce comme en V1 — voir CLAUDE.md, "Écarts assumés").
    """
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="datarooms")

    def __str__(self):
        return self.name

class Folder(models.Model):
    """Même patron que Dataroom/Document : vit dans la base tenant, absent de
    SHARED_MODELS par conception (voir tenancy/router.py). Un dossier appartient à une
    Dataroom et peut être imbriqué dans un autre Folder de la même dataroom (parent
    nullable = dossier racine)."""
    dataroom = models.ForeignKey(Dataroom, on_delete=models.CASCADE, related_name="folders")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    """Vit dans la même base tenant que Dataroom — FK classique autorisée (contrairement
    à une FK vers Office/User, qui vivent dans default). folder=None signifie que le
    document est à la racine de la dataroom, pas dans un sous-dossier."""
    dataroom = models.ForeignKey(Dataroom, on_delete=models.CASCADE, related_name="documents")
    folder = models.ForeignKey(
        Folder, null=True, blank=True, on_delete=models.CASCADE, related_name="documents"
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=tenant_document_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="documents")

    def __str__(self):
        return self.name

class AccessRestriction(models.Model):
    """Restreint l'accès à un Dataroom/Folder/Document précis — même patron que
    Dataroom/Folder/Document : vit dans la base tenant, absent de SHARED_MODELS
    par conception (voir tenancy/router.py).

    Deux critères d'accès, indépendants l'un de l'autre (accès si l'un OU
    l'autre est vrai — voir views._user_can_access, changement du 02/09/2026) :
    - `user_ids` (JSONField, liste d'entiers) — des utilisateurs nommés
      individuellement. Pas de ForeignKey vers User : User vit dans la base
      default, une vraie FK cross-DB n'est pas possible avec ce mécanisme —
      même contrainte déjà rencontrée pour Dataroom → Office.
    - `allowed_roles` (JSONField, liste parmi "admin"/"membre"/"client" —
      JAMAIS "superadmin", voir plus bas) — n'importe quel membre de l'office
      ayant l'un de ces rôles pour CET office, sans avoir à être nommé
      individuellement.
    Un superadmin a TOUJOURS accès, avant même de regarder cette ligne — pas
    une case parmi d'autres dans `allowed_roles`, un court-circuit dans
    views._user_can_access. C'est pour ça qu'"superadmin" n'apparaît jamais
    dans `allowed_roles` (filtré par views._clean_access_roles même s'il est
    envoyé explicitement) : le lister n'aurait aucun effet, laisser croire le
    contraire serait trompeur.

    Exactement un des trois FK (dataroom/folder/document) est renseigné par ligne —
    invariant appliqué au niveau applicatif (views._set_restriction), pas par contrainte
    SQL, cette ligne n'étant créée que par ce chemin unique. La restriction s'applique au
    niveau visé ET à tout son contenu imbriqué (sous-dossiers, documents), sauf si un
    niveau plus profond porte sa propre restriction : c'est la restriction la PLUS
    PROCHE dans la hiérarchie qui s'applique (pas de fusion/union de plusieurs
    restrictions le long de la chaîne) — voir views._nearest_restriction. Absence de
    restriction sur toute la chaîne = accès ouvert à tout membre de l'office
    (comportement par défaut, inchangé). `user_ids`/`allowed_roles` vides TOUS LES
    DEUX n'existe pas en pratique : voir views._set_restriction, qui supprime la
    ligne plutôt que de la laisser dans cet état (repasser par la case "aucune
    restriction" est plus explicite qu'une ligne "restreint à personne")."""
    dataroom = models.OneToOneField(
        Dataroom, null=True, blank=True, on_delete=models.CASCADE, related_name="access_restriction"
    )
    folder = models.OneToOneField(
        Folder, null=True, blank=True, on_delete=models.CASCADE, related_name="access_restriction"
    )
    document = models.OneToOneField(
        Document, null=True, blank=True, on_delete=models.CASCADE, related_name="access_restriction"
    )
    user_ids = models.JSONField(default=list)
    allowed_roles = models.JSONField(default=list, blank=True)

    def __str__(self):
        target = self.dataroom or self.folder or self.document
        return f"Restriction sur {target} ({len(self.user_ids)} utilisateur(s), rôles {self.allowed_roles})"

class Template(models.Model):
    """Structure de dossiers réutilisable pour créer des Dataroom pré-remplies —
    même patron que Dataroom/Folder/Document/AccessRestriction : vit dans la base
    tenant, absent de SHARED_MODELS par conception (voir tenancy/router.py), pas
    de FK vers Office (déjà déterminé par le fichier SQLite).

    Une définition PURE, jamais liée à une dataroom précise : l'appliquer à la
    création d'une Dataroom (views._apply_template) copie son arborescence de
    TemplateFolder en de VRAIS Folder/AccessRestriction indépendants. Modifier ce
    Template (ou ses TemplateFolder) par la suite n'affecte JAMAIS les datarooms
    déjà créées à partir d'une version antérieure — aucun lien n'est conservé vers
    le Template d'origine après application."""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class TemplateFolder(models.Model):
    """Nœud de l'arborescence d'un Template — même patron que Folder (parent
    nullable = racine du template, imbrication via self-FK, cascade sur les
    enfants à la suppression).

    Porte EXACTEMENT le même modèle de droits qu'AccessRestriction, en miroir
    (renommé le 02/09/2026, `visible_to_roles` → `allowed_roles`, ajout de
    `user_ids`) — logique, puisque l'application du template (views.
    _apply_template) copie ces deux champs directement sur l'AccessRestriction
    du Folder réel obtenu :
    - `allowed_roles` (liste parmi "admin"/"membre"/"client", jamais
      "superadmin" — voir AccessRestriction) copié TEL QUEL, aucune
      "résolution" nécessaire : AccessRestriction comprend nativement les
      rôles depuis ce même jour.
    - `user_ids` référence des membres de CET office (Template vit dans la
      base tenant, donc déjà scopé à un office précis — contrairement à
      AccessRestriction, pas besoin d'attendre l'application pour savoir de
      quel office il s'agit). Re-vérifiés contre les OfficeMembership RÉELS
      de l'office au moment de l'application (un utilisateur nommé ici peut
      avoir quitté l'office entre-temps) — seule "résolution" encore
      nécessaire, même défense en profondeur que views._set_restriction.
    Les deux vides = aucune AccessRestriction créée pour le Folder obtenu, qui
    reste alors au comportement d'accès par défaut selon le rôle (voir
    views._user_can_access : ouvert pour membre/admin/superadmin, fermé pour
    client)."""
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name="folders")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    name = models.CharField(max_length=255)
    allowed_roles = models.JSONField(default=list, blank=True)
    user_ids = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name