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

    def __str__(self):
        return self.name

class OfficeMembership(models.Model):
    ROLE_CHOICES = [
        ("superadmin", "Superadmin"),
        ("admin", "Admin"),
        ("membre", "Membre"),
        ("client", "Client"),
    ]
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

class Document(models.Model):
    """Vit dans la même base tenant que Dataroom — FK classique autorisée (contrairement
    à une FK vers Office/User, qui vivent dans default)."""
    dataroom = models.ForeignKey(Dataroom, on_delete=models.CASCADE, related_name="documents")
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=tenant_document_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name