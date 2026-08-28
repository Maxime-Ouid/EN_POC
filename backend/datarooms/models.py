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
    subdomain = models.SlugField(unique=True)  # "officea"
    name = models.CharField(max_length=255)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1a56db")
    enabled_modules = models.ManyToManyField(Module, blank=True, related_name="offices")

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

    class Meta:
        unique_together = ("user", "office")

    def __str__(self):
        return f"{self.user} @ {self.office} ({self.role})"

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

    def __str__(self):
        return self.name

class AccessRestriction(models.Model):
    """Restreint l'accès à un Dataroom/Folder/Document précis à une liste d'utilisateurs
    — même patron que Dataroom/Folder/Document : vit dans la base tenant, absent de
    SHARED_MODELS par conception (voir tenancy/router.py). Référence les utilisateurs par
    id simple (JSONField, liste d'entiers), pas de ForeignKey vers User : User vit dans
    la base default, une vraie FK cross-DB n'est pas possible avec ce mécanisme — même
    contrainte déjà rencontrée pour Dataroom → Office.

    Exactement un des trois FK (dataroom/folder/document) est renseigné par ligne —
    invariant appliqué au niveau applicatif (views._set_restriction), pas par contrainte
    SQL, cette ligne n'étant créée que par ce chemin unique. La restriction s'applique au
    niveau visé ET à tout son contenu imbriqué (sous-dossiers, documents), sauf si un
    niveau plus profond porte sa propre restriction : c'est la restriction la PLUS
    PROCHE dans la hiérarchie qui s'applique (pas de fusion/union de plusieurs
    restrictions le long de la chaîne) — voir views._nearest_restriction. Absence de
    restriction sur toute la chaîne = accès ouvert à tout membre de l'office
    (comportement par défaut, inchangé). Une liste `user_ids` vide n'existe pas en
    pratique : voir views._set_restriction, qui supprime la ligne plutôt que de la
    laisser vide (repasser par la case "aucune restriction" est plus explicite qu'une
    ligne "restreint à personne")."""
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

    def __str__(self):
        target = self.dataroom or self.folder or self.document
        return f"Restriction sur {target} ({len(self.user_ids)} utilisateur(s))"