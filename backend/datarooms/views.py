import mimetypes
import re
from urllib.parse import quote

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.http import FileResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render

from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .mfa import qr_code_data_uri
from .models import (
    AccessRestriction, Dataroom, Document, Folder, HyperadminAccess, Module, Office, OfficeMembership,
    Tag, Template, TemplateFolder,
)
from .tenancy.registry import ensure_tenant_registered
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import (
    DashboardValidationError, TagValidationError, ThemeValidationError,
    clean_dashboard_payload, clean_tag_ids, clean_tag_payload, clean_theme_payload,
    is_accepted_extension, tag_slug,
)

User = get_user_model()

@api_view(['GET'])
def ping(request):
    return Response({"status": "ok"})

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"error": "Identifiants incorrects"}, status=400)

    # Identifiants valides, mais encore fallait-il que ce compte ait un motif de
    # se connecter SUR CET OFFICE précis — avant le 01/09/2026, n'importe quel
    # compte pouvait ouvrir une session sur n'importe quel sous-domaine d'office,
    # même sans y être jamais rattaché (les endpoints de données revérifiaient
    # bien l'appartenance ensuite, donc pas de fuite, mais la connexion elle-même
    # n'aurait jamais dû aboutir). _is_hyperadmin en exception délibérée : un
    # hyperadmin n'a par construction AUCUN OfficeMembership nulle part (voir
    # HyperadminAccess) et doit pouvoir se connecter depuis n'importe quel
    # sous-domaine d'office, conformément à la décision de ne pas lui dédier un
    # sous-domaine séparé (voir CLAUDE.md).
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not user.memberships.filter(office=office).exists() and not _is_hyperadmin(user):
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    # Mot de passe validé, mais pas de session ouverte tant que la MFA n'est pas
    # passée — voir mfa_setup/mfa_verify. request.session['mfa_user_id'] atteste
    # d'une authentification en attente, sans authentifier request.user pour autant
    # (django.contrib.auth.login() n'est appelé que là-bas).
    request.session['mfa_user_id'] = user.id
    has_device = TOTPDevice.objects.filter(user=user, confirmed=True).exists()
    return Response({"mfa_required": True, "enrollment": not has_device})

def _pending_mfa_user(request):
    user_id = request.session.get('mfa_user_id')
    if not user_id:
        return None
    return User.objects.filter(pk=user_id).first()

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def mfa_setup(request):
    """Enrôlement TOTP — uniquement pour un utilisateur sans dispositif confirmé,
    identifié via la session posée par login_view (pas IsAuthenticated : l'utilisateur
    n'est justement pas encore connecté à ce stade)."""
    user = _pending_mfa_user(request)
    if user is None:
        return Response({"error": "Aucune connexion en attente"}, status=400)

    if request.method == 'GET':
        device, _ = TOTPDevice.objects.get_or_create(
            user=user, confirmed=False, defaults={'name': 'default'}
        )
        return Response({"qr_code": qr_code_data_uri(device.config_url), "secret": device.key})

    token = request.data.get('token', '')
    device = TOTPDevice.objects.filter(user=user, confirmed=False).order_by('-id').first()
    if device is None or not device.verify_token(token):
        return Response({"error": "Code invalide"}, status=400)
    device.confirmed = True
    device.save()
    login(request, user)
    del request.session['mfa_user_id']
    return Response({"username": user.username})

@api_view(['POST'])
@permission_classes([AllowAny])
def mfa_verify(request):
    """Vérification TOTP pour un utilisateur ayant déjà un dispositif confirmé."""
    user = _pending_mfa_user(request)
    if user is None:
        return Response({"error": "Aucune connexion en attente"}, status=400)

    token = request.data.get('token', '')
    device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
    if device is None or not device.verify_token(token):
        return Response({"error": "Code invalide"}, status=400)
    login(request, user)
    del request.session['mfa_user_id']
    return Response({"username": user.username})

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """Ferme la session de l'office courant.

    AllowAny et non IsAuthenticated : se déconnecter d'une session déjà expirée
    doit réussir, pas répondre 403. `logout()` vide aussi `mfa_user_id`, donc une
    connexion abandonnée entre le mot de passe et le code TOTP est annulée.

    La session est scopée à l'hôte de l'office (SESSION_COOKIE_DOMAIN non
    défini) : les autres sous-domaines gardent la leur.
    """
    logout(request)
    return Response({"status": "ok"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whoami(request):
    return Response({"username": request.user.username})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_offices(request):
    memberships = request.user.memberships.select_related('office')
    return Response([
        {"subdomain": m.office.subdomain, "name": m.office.name, "role": m.role}
        for m in memberships
    ])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tenant_config(request):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    return Response({
        "name": office.name,
        "logo_url": office.logo_url,
        "primary_color": office.primary_color,
        "enabled_modules": list(office.enabled_modules.values_list('slug', flat=True)),
    })

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def tenant_theme(request):
    """Personnalisation visuelle de l'office courant (Office.theme).

    GET  → 200 avec le thème enregistré, 204 si l'office n'a jamais personnalisé
           (le front applique alors les valeurs Notantis par défaut).
    PUT  → 200 avec le thème normalisé tel qu'il vient d'être stocké.

    La lecture est ouverte à tout membre de l'office : le thème conditionne
    l'affichage de chacun. L'écriture est réservée aux rôles admin et superadmin
    — un membre ou un client ne repeint pas l'espace de toute l'étude.
    """
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    membership = request.user.memberships.filter(office=office).first()
    if membership is None:
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    if request.method == 'PUT':
        if membership.role not in ('superadmin', 'admin'):
            return Response(
                {"error": "seul un administrateur de l'office peut modifier l'apparence"},
                status=403,
            )
        try:
            theme = clean_theme_payload(request.data)
        except ThemeValidationError as exc:
            return Response({"error": str(exc)}, status=400)
        office.theme = theme
        office.save(update_fields=['theme'])
        return Response(theme)

    if not office.theme:
        return Response(status=204)
    return Response(office.theme)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """Disposition de l'écran d'accueil de l'appelant dans l'office courant.

    GET    → 200 avec la disposition enregistrée, 204 si ce membre n'a jamais
             réorganisé son accueil (le front applique alors le template déduit
             de son rôle).
    PUT    → 200 avec la disposition normalisée telle qu'elle vient d'être
             stockée.
    DELETE → 204, retour au template : la personnalisation est effacée.

    Contrairement à `tenant_theme`, l'écriture n'est réservée à personne : ce
    que chacun range sur SON accueil ne regarde que lui, et un client qui
    déplace ses widgets ne change rien pour l'étude. Il n'y a donc pas non plus
    de chemin pour écrire la disposition d'un autre membre — l'objet modifié est
    toujours le membership de `request.user`, jamais un identifiant reçu du
    client.
    """
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    membership = request.user.memberships.filter(office=office).first()
    if membership is None:
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    if request.method == 'PUT':
        try:
            dashboard = clean_dashboard_payload(request.data)
        except DashboardValidationError as exc:
            return Response({"error": str(exc)}, status=400)
        membership.dashboard = dashboard
        membership.save(update_fields=['dashboard'])
        return Response(dashboard)

    if request.method == 'DELETE':
        # `update_fields` plutôt qu'un save complet : le rôle du membership est
        # géré ailleurs (office_user_detail_view) et ne doit pas être réécrit au
        # passage par une valeur lue avant une modification concurrente.
        membership.dashboard = None
        membership.save(update_fields=['dashboard'])
        return Response(status=204)

    if not membership.dashboard:
        return Response(status=204)
    return Response(_dashboard_with_pages(membership.dashboard))


def _dashboard_with_pages(stored):
    """Rend une disposition lisible par le front actuel, quelle que soit son âge.

    Les dispositions enregistrées avant les onglets ont la forme
    `{"template": ..., "widgets": [...]}`. Sans cette conversion À LA LECTURE, le
    front n'y trouverait pas de `pages`, retomberait sur le template du rôle, et
    l'utilisateur verrait son rangement disparaître — pour de bon, puisque le
    premier déplacement suivant écraserait l'ancien contenu.

    La conversion n'écrit RIEN : la ligne reste à l'ancienne forme jusqu'au
    prochain enregistrement, qui la normalisera (clean_dashboard_payload). Une
    migration de données serait plus propre, mais elle devrait tourner sur la
    base « default » de chaque déploiement pour un format vieux de quelques
    jours ; ce repli-ci coûte six lignes et se supprime le jour où plus aucune
    ligne n'a l'ancienne forme.
    """
    if not isinstance(stored, dict) or "pages" in stored:
        return stored
    widgets = stored.get("widgets")
    if not isinstance(widgets, list):
        return stored
    return {
        "template": stored.get("template"),
        "pages": [{"id": "accueil", "name": "Accueil", "widgets": widgets}],
    }

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coffre_fort_view(request):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)
    if not office.enabled_modules.filter(slug="coffre-fort").exists():
        return Response({"error": "module non activé pour cet office"}, status=403)
    return Response({"message": "Contenu du module Coffre-fort (démo)"})

def _manager_role(user, office):
    """Rôle admin/superadmin de l'appelant pour CET office précis, ou None s'il n'en a
    pas (pas membre de cet office, ou membre mais avec un rôle inférieur) — jamais
    déduit d'un rôle que l'appelant aurait sur un autre office (ex: carla)."""
    membership = user.memberships.filter(office=office).first()
    if membership is None or membership.role not in ("admin", "superadmin"):
        return None
    return membership.role

def _roles_at_or_below(rank):
    """Rôles dont le rang est <= rank — ce qu'un gestionnaire de ce rang peut voir/gérer.
    Un admin (rang 2) obtient admin/membre/client, jamais superadmin (rang 3) ; un
    superadmin (rang 3) obtient les quatre."""
    return [role for role, r in OfficeMembership.ROLE_RANK.items() if r <= rank]

def _validate_role_for_caller(role, caller_rank):
    """None si role est un choix valide ET accessible au rang de l'appelant, sinon un
    message d'erreur générique — un rôle hors de portée (ex: superadmin proposé par un
    admin) est signalé comme "invalide", pas distingué d'un rôle qui n'existe pas : ne
    pas donner à l'appelant une confirmation qu'un rang plus élevé existe."""
    if role not in OfficeMembership.ROLE_RANK:
        return "rôle invalide"
    if OfficeMembership.ROLE_RANK[role] > caller_rank:
        return "rôle invalide"
    return None

def _serialize_membership(membership):
    return {
        "membership_id": membership.id,
        "user_id": membership.user_id,
        "username": membership.user.username,
        "role": membership.role,
    }

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def office_users_view(request):
    """Gestion des utilisateurs d'un office par ses admins/superadmins — scopée à
    request.office uniquement, jamais aux autres offices auxquels l'appelant a
    éventuellement aussi accès (ex: carla). OfficeMembership/User vivent dans la base
    default (registre transverse, voir tenancy/router.py) : l'isolation par office
    est donc appliquée ici au niveau requête (filter(office=office)), pas au niveau
    base physique comme pour Dataroom/Document/Folder.

    Visibilité hiérarchique : un admin (pas superadmin) ne voit ni ne peut créer de
    membership de rôle superadmin sur son office — voir _roles_at_or_below/
    _validate_role_for_caller et OfficeMembership.ROLE_RANK."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    caller_role = _manager_role(request.user, office)
    if caller_role is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)
    caller_rank = OfficeMembership.ROLE_RANK[caller_role]

    if request.method == 'POST':
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        role = request.data.get('role') or ''
        if not username:
            return Response({"error": "nom d'utilisateur requis"}, status=400)
        role_error = _validate_role_for_caller(role, caller_rank)
        if role_error:
            return Response({"error": role_error}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"error": "nom d'utilisateur déjà utilisé"}, status=400)
        try:
            validate_password(password)
        except ValidationError as exc:
            return Response({"error": " ".join(exc.messages)}, status=400)
        user = User.objects.create_user(username=username, password=password)
        membership = OfficeMembership.objects.create(user=user, office=office, role=role)
        return Response(_serialize_membership(membership), status=201)

    memberships = (
        OfficeMembership.objects.filter(office=office, role__in=_roles_at_or_below(caller_rank))
        .select_related('user')
        .order_by('user__username')
    )
    return Response([_serialize_membership(m) for m in memberships])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def attach_office_user_view(request):
    """Rattache un utilisateur EXISTANT (recherche par nom exact, pas de création de
    compte) à l'office courant. Volontairement pas de recherche/autocomplete sur les
    utilisateurs existants — voir §4.1 du document de vision sur l'annuaire d'offices
    exposé lors d'un partage entre études, déjà identifié comme point de sécurité à ne
    pas reproduire (CLAUDE.md, "Écarts assumés") : l'admin doit connaître le nom exact,
    et un nom introuvable renvoie une erreur générique qui ne confirme ni n'infirme son
    existence ailleurs dans le système."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    caller_role = _manager_role(request.user, office)
    if caller_role is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)
    caller_rank = OfficeMembership.ROLE_RANK[caller_role]

    username = (request.data.get('username') or '').strip()
    role = request.data.get('role') or ''
    if not username:
        return Response({"error": "nom d'utilisateur requis"}, status=400)
    role_error = _validate_role_for_caller(role, caller_rank)
    if role_error:
        return Response({"error": role_error}, status=400)

    user = User.objects.filter(username=username).first()
    if user is None:
        return Response({"error": "utilisateur introuvable"}, status=404)
    if OfficeMembership.objects.filter(user=user, office=office).exists():
        return Response({"error": "cet utilisateur est déjà membre de cet office"}, status=400)

    membership = OfficeMembership.objects.create(user=user, office=office, role=role)
    return Response(_serialize_membership(membership), status=201)

def _purge_user_from_restrictions(user_id):
    """Retire un utilisateur des restrictions d'accès de l'office COURANT.

    Les restrictions référencent les utilisateurs par id nu (JSONField, pas de FK :
    User vit dans la base default, la restriction dans celle du tenant). Rien ne
    nettoie donc ces listes quand une appartenance disparaît — l'id resterait là,
    sans effet tant que la personne est dehors, mais réactivé silencieusement le
    jour où on la rattache. Une restriction vidée est supprimée plutôt que laissée
    vide, conformément à l'invariant du modèle (une liste vide n'existe pas : voir
    AccessRestriction et _set_restriction).
    """
    for restriction in AccessRestriction.objects.all():
        if user_id not in restriction.user_ids:
            continue
        restants = [uid for uid in restriction.user_ids if uid != user_id]
        if restants:
            restriction.user_ids = restants
            restriction.save()
        else:
            restriction.delete()

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def office_user_detail_view(request, membership_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    caller_role = _manager_role(request.user, office)
    if caller_role is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)
    caller_rank = OfficeMembership.ROLE_RANK[caller_role]

    # Scopé à office=office ET à role__in=_roles_at_or_below(caller_rank) : un
    # membership_id valide mais appartenant à un AUTRE office, OU à un membership
    # superadmin visé par un admin, est introuvable ici, pas juste refusé — même
    # logique que _resolve_folder pour Dataroom/Folder (on ne confirme même pas son
    # existence).
    try:
        membership = OfficeMembership.objects.select_related('user').get(
            pk=membership_id, office=office, role__in=_roles_at_or_below(caller_rank)
        )
    except OfficeMembership.DoesNotExist:
        return Response({"error": "utilisateur introuvable pour cet office"}, status=404)

    if request.method == 'DELETE':
        # Se retirer soi-même est refusé : un superadmin seul de son office se
        # mettrait dehors sans aucun recours dans l'application (il n'existe pas
        # d'écran pour se rattacher soi-même, seulement pour rattacher un autre).
        if membership.user_id == request.user.id:
            return Response(
                {"error": "impossible de retirer votre propre appartenance à cet office"},
                status=400,
            )
        _purge_user_from_restrictions(membership.user_id)
        membership.delete()
        return Response(status=204)

    role = request.data.get('role')
    role_error = _validate_role_for_caller(role, caller_rank)
    if role_error:
        return Response({"error": role_error}, status=400)
    membership.role = role
    membership.save()
    return Response(_serialize_membership(membership))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def issue_sso_ticket(request):
    target = request.data.get('target')
    office = Office.objects.filter(subdomain=target).first()
    if office is None or not request.user.memberships.filter(office=office).exists():
        return Response({"error": "office cible invalide ou non autorisé"}, status=400)
    ticket = issue_ticket(request.user.id, office.subdomain)
    return Response({"ticket": ticket})

def consume_sso_ticket(request):
    payload = consume_ticket(request.GET.get('ticket', ''))
    if payload is None or request.office is None or payload.get('target') != request.office.subdomain:
        return HttpResponseBadRequest("Ticket SSO invalide ou expiré.")
    try:
        user = User.objects.get(pk=payload['user_id'])
    except User.DoesNotExist:
        return HttpResponseBadRequest("Ticket SSO invalide ou expiré.")
    login(request, user)
    return HttpResponseRedirect(f"https://{request.office.subdomain}.localhost:5173/")

# ---------------------------------------------------------------------------
# Tags — catalogue de l'office (modèle Tag) et affectation aux dossiers/pièces.
#
# Deux niveaux de droits, volontairement asymétriques : TOUT membre peut créer un tag
# et en poser/retirer sur un élément (c'est la « création à la volée » — sans elle, le
# tagging meurt d'attendre un admin), mais seuls admin/superadmin peuvent RENOMMER ou
# SUPPRIMER une entrée du catalogue, ces deux actions étant les seules à toucher tous
# les éléments déjà tagués d'un coup.
# ---------------------------------------------------------------------------

def _office_member_guard(request):
    """(office, None) si l'appelant est membre de l'office résolu, (None, Response)
    sinon — exactement les deux mêmes réponses que les vues existantes, factorisées
    ici parce que les quatre vues de tags les répètent à l'identique."""
    office = request.office
    if office is None:
        return None, Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return None, Response({"error": "accès non autorisé à cet office"}, status=403)
    return office, None

def _serialize_tag(tag, *, usage=None):
    data = {"id": tag.id, "name": tag.name, "slug": tag.slug, "color": tag.color}
    if usage is not None:
        data["usage"] = usage
    return data

def _tags_of(obj):
    """Tags d'une dataroom/d'un document, ordonnés par nom (Tag.Meta.ordering) pour
    que la colonne « Tags » ne change pas d'ordre d'un rafraîchissement à l'autre."""
    return [_serialize_tag(t) for t in obj.tags.all()]

def _get_or_create_tag(name, color):
    """Retourne (tag, created). Déduplique sur le slug : demander « Vente » quand
    « vente » existe rend le tag existant SANS toucher à sa couleur — deux membres qui
    tapent le même mot le même jour doivent atterrir sur la même entrée, pas se voler
    la couleur à tour de rôle."""
    slug = tag_slug(name)
    existing = Tag.objects.filter(slug=slug).first()
    if existing is not None:
        return existing, False
    return Tag.objects.create(name=name, slug=slug, color=color), True

def _resolve_tag_ids(raw_ids):
    """Résout des ids de tags dans la base tenant courante.

    Lève TagValidationError si l'un d'eux n'y est pas : un id parfaitement valide dans
    l'office voisin ne doit pas passer en silence — même règle que `_resolve_folder`
    pour les dossiers d'une autre dataroom.
    """
    ids = clean_tag_ids(raw_ids)
    tags = list(Tag.objects.filter(id__in=ids))
    if len(tags) != len(ids):
        raise TagValidationError("tag introuvable")
    return tags

def _requested_tag_filter(request):
    """Ids de tags demandés en filtre via `?tags=1,2`. Retourne None si le paramètre
    est absent (pas de filtre) et [] s'il est présent mais vide/illisible — un filtre
    illisible ne doit pas se transformer en « tout afficher », qui donnerait
    l'impression que le filtre ne marche pas plutôt qu'une liste vide explicite."""
    raw = request.GET.get('tags')
    if raw is None:
        return None
    ids = []
    for chunk in raw.split(','):
        chunk = chunk.strip()
        if chunk.isdigit():
            value = int(chunk)
            if value not in ids:
                ids.append(value)
    return ids

def _matches_tag_filter(obj, wanted_ids):
    """Sémantique OU (au moins un des tags cochés) — décidée le 01/09/2026. Le ET
    n'est pas une variante d'implémentation à laisser traîner ici : le jour où il est
    demandé, il arrive avec son propre paramètre (`?tags_mode=all`) et son propre
    contrôle côté interface."""
    if wanted_ids is None:
        return True
    if not wanted_ids:
        return False
    return any(t.id in wanted_ids for t in obj.tags.all())

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tags_view(request):
    """GET : catalogue de l'office, avec le nombre d'éléments portant chaque tag.
    POST : crée un tag (ou rend l'existant si le slug est déjà pris, cf.
    _get_or_create_tag) — 201 pour une vraie création, 200 pour un tag rendu tel quel,
    ce qui permet au front de distinguer « ajouté au catalogue » de « existait déjà »
    sans second appel."""
    office, error = _office_member_guard(request)
    if error:
        return error

    if request.method == 'POST':
        try:
            payload = clean_tag_payload(request.data)
        except TagValidationError as exc:
            return Response({"error": str(exc)}, status=400)
        tag, created = _get_or_create_tag(payload["name"], payload["color"])
        return Response(_serialize_tag(tag, usage=0 if created else _tag_usage(tag)),
                        status=201 if created else 200)

    return Response([_serialize_tag(t, usage=_tag_usage(t)) for t in Tag.objects.all()])

def _tag_usage(tag):
    """Nombre d'éléments portant ce tag, dossiers et pièces confondus. Sert à afficher
    « Vente (12) » dans le menu de filtre et à avertir avant une suppression — pas à
    trier : un catalogue qui se réordonne à chaque dépôt de document est illisible."""
    return tag.datarooms.count() + tag.documents.count()

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def tag_detail_view(request, tag_id):
    """Renommer/recolorer (PATCH) ou supprimer (DELETE) une entrée du catalogue —
    admin/superadmin de CET office uniquement (voir _manager_role). La suppression
    retire le tag de tous les éléments qui le portaient (cascade de la table pivot),
    elle ne supprime évidemment aucun dossier ni document."""
    office, error = _office_member_guard(request)
    if error:
        return error
    if _manager_role(request.user, office) is None:
        return Response({"error": "action réservée aux administrateurs de l'office"}, status=403)

    try:
        tag = Tag.objects.get(pk=tag_id)
    except Tag.DoesNotExist:
        return Response({"error": "tag introuvable"}, status=404)

    if request.method == 'DELETE':
        tag.delete()
        return Response(status=204)

    try:
        payload = clean_tag_payload(request.data, partial=True)
    except TagValidationError as exc:
        return Response({"error": str(exc)}, status=400)

    if "name" in payload:
        new_slug = tag_slug(payload["name"])
        # Renommer vers un nom déjà pris fusionnerait deux entrées sans le dire :
        # on refuse, à charge de l'appelant de supprimer l'une des deux.
        if Tag.objects.filter(slug=new_slug).exclude(pk=tag.pk).exists():
            return Response({"error": "un tag porte déjà ce nom"}, status=409)
        tag.name = payload["name"]
        tag.slug = new_slug
    if "color" in payload:
        tag.color = payload["color"]
    tag.save()
    return Response(_serialize_tag(tag, usage=_tag_usage(tag)))

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def dataroom_tags_view(request, dataroom_id):
    """Remplace l'ensemble des tags du dossier par la liste reçue (`{"tags": [id, …]}`).

    Remplacement et non ajout/retrait unitaire : l'interface manipule une sélection
    entière (on coche/décoche dans un menu), et un PUT idempotent évite d'avoir à
    réconcilier deux ordres d'arrivée concurrents.
    """
    office, error = _office_member_guard(request)
    if error:
        return error
    dataroom, not_found = _dataroom_or_404(dataroom_id)
    if not_found:
        return not_found
    # Même garde que l'upload : on ne modifie pas un dossier qu'on ne peut pas voir,
    # et on répond 404 plutôt que 403 pour ne pas confirmer son existence.
    if not _user_can_access(request.user, office, dataroom):
        return Response({"error": "dossier introuvable"}, status=404)

    try:
        tags = _resolve_tag_ids(request.data.get('tags'))
    except TagValidationError as exc:
        return Response({"error": str(exc)}, status=400)

    dataroom.tags.set(tags)
    return Response({"id": dataroom.id, "tags": _tags_of(dataroom)})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def document_tags_view(request, dataroom_id, document_id):
    """Même contrat que dataroom_tags_view, pour une pièce."""
    office, error = _office_member_guard(request)
    if error:
        return error
    dataroom, not_found = _dataroom_or_404(dataroom_id)
    if not_found:
        return not_found
    try:
        document = dataroom.documents.get(pk=document_id)
    except Document.DoesNotExist:
        return Response({"error": "document introuvable"}, status=404)
    if not _user_can_access(request.user, office, dataroom, folder=document.folder, document=document):
        return Response({"error": "document introuvable"}, status=404)

    try:
        tags = _resolve_tag_ids(request.data.get('tags'))
    except TagValidationError as exc:
        return Response({"error": str(exc)}, status=400)

    document.tags.set(tags)
    return Response({"id": document.id, "tags": _tags_of(document)})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def datarooms_view(request):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    if request.method == 'POST':
        # Réservé admin/superadmin de l'office (même gate que la gestion des
        # Templates et des utilisateurs) — créer une dataroom n'est pas ouvert à
        # tout membre, contrairement à la lecture ci-dessous (_level_visible).
        if _manager_role(request.user, office) is None:
            return Response({"error": "réservé aux administrateurs de cet office"}, status=403)
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        template = None
        template_id = request.data.get('template_id')
        if template_id:
            try:
                template = Template.objects.get(pk=template_id)
            except Template.DoesNotExist:
                return Response({"error": "modèle introuvable"}, status=400)
        # `tags` est optionnel à la création : la modale « Nouveau dossier » peut en
        # poser d'emblée, mais un client d'API qui l'ignore crée un dossier sans tag
        # exactement comme avant.
        try:
            tags = _resolve_tag_ids(request.data['tags']) if 'tags' in request.data else []
        except TagValidationError as exc:
            return Response({"error": str(exc)}, status=400)
        dataroom = Dataroom.objects.create(name=name)
        if template is not None:
            _apply_template(dataroom, template, office)
        if tags:
            dataroom.tags.set(tags)
        return Response(
            {"id": dataroom.id, "name": dataroom.name, "tags": _tags_of(dataroom)}, status=201
        )

    # `?tags=1,2` : au moins un des tags demandés (OU). Absent = pas de filtre.
    wanted_tags = _requested_tag_filter(request)
    datarooms = Dataroom.objects.order_by('-created_at').prefetch_related('tags')
    return Response([
        {"id": d.id, "name": d.name, "created_at": d.created_at, "tags": _tags_of(d)}
        for d in datarooms
        if _level_visible(request.user, office, d) and _matches_tag_filter(d, wanted_tags)
    ])

def _apply_template(dataroom, template, office):
    """Reproduit récursivement l'arborescence de TemplateFolder de `template` en
    VRAIS Folder pour `dataroom`, et pour chaque TemplateFolder ayant un
    visible_to_roles non vide, résout les rôles en utilisateurs réels de `office`
    (via OfficeMembership — c'est ICI et seulement ici que les rôles deviennent
    des ids concrets) et crée l'AccessRestriction correspondante sur le Folder
    nouvellement créé. Un TemplateFolder sans visible_to_roles ne crée aucune
    restriction : le Folder obtenu reste au comportement d'accès par défaut selon
    le rôle (_user_can_access, changement du 01/09/2026).

    Copie ponctuelle, jamais un lien vivant : aucune référence vers `template`/
    ses TemplateFolder n'est conservée sur les Folder/AccessRestriction créés ici
    — modifier le Template par la suite n'affecte donc jamais `dataroom`."""
    def walk(template_parent, real_parent):
        for tf in TemplateFolder.objects.filter(template=template, parent=template_parent):
            folder = Folder.objects.create(dataroom=dataroom, parent=real_parent, name=tf.name)
            if tf.visible_to_roles:
                user_ids = list(
                    OfficeMembership.objects.filter(
                        office=office, role__in=tf.visible_to_roles
                    ).values_list('user_id', flat=True)
                )
                # Liste vide après résolution (aucun membre de l'office n'a un de
                # ces rôles) => pas de restriction créée, même invariant que
                # _set_restriction : une AccessRestriction "restreint à personne"
                # n'existe jamais.
                if user_ids:
                    AccessRestriction.objects.create(folder=folder, user_ids=user_ids)
            walk(tf, folder)
    walk(None, None)

def _dataroom_or_404(dataroom_id):
    try:
        return Dataroom.objects.get(pk=dataroom_id), None
    except Dataroom.DoesNotExist:
        return None, Response({"error": "dataroom introuvable"}, status=404)

class _FolderNotFound(Exception):
    pass

def _resolve_folder(dataroom, raw_folder_id):
    """Résout un id de dossier optionnel (query param ou champ de formulaire) en
    instance Folder, scopée à la dataroom courante pour éviter qu'un id valide d'une
    AUTRE dataroom du même tenant ne soit accepté par erreur. None (id absent) = racine
    de la dataroom. Lève _FolderNotFound si l'id est fourni mais invalide — au caller
    de choisir le status code (400 en écriture, 404 en lecture)."""
    if not raw_folder_id:
        return None
    try:
        return Folder.objects.get(pk=raw_folder_id, dataroom=dataroom)
    except Folder.DoesNotExist:
        raise _FolderNotFound

def _nearest_restriction(dataroom, folder=None, document=None):
    """Restriction la plus proche entre `document`/`folder` (en remontant vers la
    racine via `parent`) et `dataroom`, ou None si toute la chaîne est sans
    restriction — accès ouvert par défaut à tout membre de l'office, comportement
    inchangé. Une restriction sur un document prime sur celle de son dossier, qui
    prime sur celle de son dossier parent, etc., jusqu'à la dataroom — PAS de
    fusion/union de plusieurs restrictions le long de la chaîne, seule la plus proche
    compte (voir AccessRestriction, "État réel du code" dans CLAUDE.md)."""
    if document is not None:
        restriction = AccessRestriction.objects.filter(document=document).first()
        if restriction is not None:
            return restriction
        folder = document.folder
    node = folder
    while node is not None:
        restriction = AccessRestriction.objects.filter(folder=node).first()
        if restriction is not None:
            return restriction
        node = node.parent
    return AccessRestriction.objects.filter(dataroom=dataroom).first()

def _user_can_access(user, office, dataroom, folder=None, document=None):
    """Accès direct à CE niveau précis (pas la visibilité de chemin, voir
    _level_visible). Si une restriction existe quelque part sur la chaîne
    (_nearest_restriction, inchangée), seule l'appartenance à `user_ids` compte —
    le rôle n'entre pas en jeu, une restriction explicite prime toujours.

    Si AUCUNE restriction n'existe sur toute la chaîne, le comportement dépend
    désormais du rôle de `user` pour CET office précis (changement du 01/09/2026,
    voir CLAUDE.md) : membre/admin/superadmin gardent l'accès ouvert par défaut
    (comportement historique, inchangé) ; un client, lui, n'a PAS accès par défaut
    — un client ne voit et n'accède qu'à ce qu'une restriction l'inclut
    explicitement. Un utilisateur sans membership pour cet office (ne devrait pas
    arriver : tous les appelants vérifient déjà l'appartenance en amont) est traité
    comme un client, par défaut fermé plutôt qu'ouvert."""
    restriction = _nearest_restriction(dataroom, folder=folder, document=document)
    if restriction is not None:
        return user.id in restriction.user_ids
    membership = user.memberships.filter(office=office).first()
    return membership is not None and membership.role != "client"

def _subtree_has_accessible_content(user, office, dataroom, folder=None):
    """True si le sous-arbre ENFANT de `folder` (racine de la dataroom si None) —
    donc son contenu, pas `folder` lui-même — contient, à n'importe quelle
    profondeur, au moins un Document ou Folder directement accessible à `user`
    (_user_can_access, héritage et défaut par rôle inchangés ici). Récursion
    explicite, séparée de _nearest_restriction/_user_can_access pour ne jamais
    risquer de modifier leur comportement déjà testé — sert uniquement à calculer
    une VISIBILITÉ DE CHEMIN (voir _level_visible), jamais à muter une
    restriction. Pas de cache/précalcul : recalculée à chaque requête, taille
    attendue d'une dataroom de POC."""
    for d in Document.objects.filter(dataroom=dataroom, folder=folder):
        if _user_can_access(user, office, dataroom, folder=folder, document=d):
            return True
    for f in Folder.objects.filter(dataroom=dataroom, parent=folder):
        if _level_visible(user, office, dataroom, folder=f):
            return True
    return False

def _level_visible(user, office, dataroom, folder=None):
    """Un Dataroom (folder=None) ou un Folder est visible si l'utilisateur y a un
    accès direct (_user_can_access, héritage et défaut par rôle inchangés ici —
    restreint davantage un contenu par ailleurs ouvert, ou fermé par défaut pour un
    client), OU si son sous-arbre contient à n'importe quelle profondeur un élément
    directement accessible via une restriction plus précise (visibilité de CHEMIN —
    permet de naviguer jusqu'à un document imbriqué même à travers des niveaux par
    ailleurs fermés, y compris la dataroom elle-même). Un client sans aucune
    restriction explicite nulle part dans une dataroom ne voit donc plus rien de
    cette dataroom (ni son nom ni son existence) — le défaut fermé de
    _user_can_access se propage automatiquement ici, sans logique supplémentaire.
    Ne mute jamais aucune restriction (voir _subtree_has_accessible_content) :
    recalculée à chaque requête à partir des restrictions telles qu'explicitement
    configurées à chaque niveau — c'est pour ça que lister un niveau ne montre que
    les éléments directement accessibles PLUS les sous-dossiers qui MÈNENT vers un
    accès plus profond, jamais le reste du contenu de ces sous-dossiers de transit
    (voir l'usage dans folders_view/documents_view/datarooms_view — uniquement les
    endpoints de LECTURE ; la création/l'upload restent gatés par _user_can_access
    seul, la visibilité de chemin n'étend jamais un droit d'écriture)."""
    return _user_can_access(user, office, dataroom, folder=folder) or _subtree_has_accessible_content(
        user, office, dataroom, folder=folder
    )

def _get_restriction_row(**target):
    return AccessRestriction.objects.filter(**target).first()

def _current_user_ids(**target):
    row = _get_restriction_row(**target)
    return row.user_ids if row else []

def _set_restriction(office, user_ids, **target):
    """Remplace la liste d'utilisateurs autorisés pour `target` (dataroom=/folder=/
    document=, exactement un). Ne conserve que des ids correspondant à de vrais
    OfficeMembership de cet office (défense en profondeur contre un id arbitraire côté
    client — silencieusement ignoré plutôt que rejeté, l'UI ne propose de toute façon
    que des membres réels). Liste vide après filtrage => supprime la ligne plutôt que
    de la laisser vide : repasser par "aucune restriction" (accès ouvert) est plus
    explicite qu'une ligne "restreint à personne"."""
    candidate_ids = {int(uid) for uid in user_ids if str(uid).lstrip('-').isdigit()}
    valid_ids = sorted(
        OfficeMembership.objects.filter(office=office, user_id__in=candidate_ids)
        .values_list('user_id', flat=True)
    )
    row = _get_restriction_row(**target)
    if not valid_ids:
        if row is not None:
            row.delete()
        return []
    if row is None:
        AccessRestriction.objects.create(user_ids=valid_ids, **target)
    else:
        row.user_ids = valid_ids
        row.save()
    return valid_ids

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def dataroom_access_view(request, dataroom_id):
    """Lecture/écriture de la restriction d'accès d'une dataroom. Réservé aux
    admins/superadmins de l'office (même gate que la gestion des utilisateurs), PAS
    filtré par _user_can_access : un gestionnaire doit toujours pouvoir gérer une
    restriction même s'il ne fait pas partie de la liste autorisée qu'il définit —
    sans quoi il pourrait se verrouiller lui-même hors de sa propre gestion."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error

    if request.method == 'POST':
        user_ids = _set_restriction(office, request.data.get('user_ids') or [], dataroom=dataroom)
        return Response({"user_ids": user_ids})
    return Response({"user_ids": _current_user_ids(dataroom=dataroom)})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def folder_access_view(request, dataroom_id, folder_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error
    try:
        folder = Folder.objects.get(pk=folder_id, dataroom=dataroom)
    except Folder.DoesNotExist:
        return Response({"error": "dossier introuvable"}, status=404)

    if request.method == 'POST':
        user_ids = _set_restriction(office, request.data.get('user_ids') or [], folder=folder)
        return Response({"user_ids": user_ids})
    return Response({"user_ids": _current_user_ids(folder=folder)})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def document_access_view(request, dataroom_id, document_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error
    try:
        document = Document.objects.get(pk=document_id, dataroom=dataroom)
    except Document.DoesNotExist:
        return Response({"error": "document introuvable"}, status=404)

    if request.method == 'POST':
        user_ids = _set_restriction(office, request.data.get('user_ids') or [], document=document)
        return Response({"user_ids": user_ids})
    return Response({"user_ids": _current_user_ids(document=document)})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def access_restrictions_view(request):
    """Liste TOUTES les restrictions actives de l'office courant, avec un libellé
    résolu et l'identifiant de la dataroom porteuse — consommé par la page
    Utilisateurs (onglet "Restrictions" par utilisateur) pour proposer, par
    utilisateur, la liste des objets déjà restreints et cocher/décocher son inclusion,
    sans dupliquer le point d'entrée "restreindre à..." déjà présent sur chaque
    dossier/document."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    results = []
    restrictions = AccessRestriction.objects.select_related(
        'dataroom', 'folder', 'folder__dataroom', 'document', 'document__dataroom'
    )
    for r in restrictions:
        if r.dataroom_id:
            kind, target_id, dataroom_id, label = "dataroom", r.dataroom_id, r.dataroom_id, r.dataroom.name
        elif r.folder_id:
            kind, target_id, dataroom_id = "folder", r.folder_id, r.folder.dataroom_id
            label = f"{r.folder.dataroom.name} / {r.folder.name}"
        else:
            kind, target_id, dataroom_id = "document", r.document_id, r.document.dataroom_id
            label = f"{r.document.dataroom.name} / {r.document.name}"
        results.append({
            "id": r.id,
            "kind": kind,
            "dataroom_id": dataroom_id,
            "target_id": target_id,
            "label": label,
            "user_ids": r.user_ids,
        })
    return Response(results)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents_view(request, dataroom_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error

    if request.method == 'POST':
        upload = request.FILES.get('file')
        if not upload:
            return Response({"error": "fichier requis"}, status=400)
        if not is_accepted_extension(upload.name):
            return Response({"error": "format de fichier non pris en charge"}, status=400)
        try:
            folder = _resolve_folder(dataroom, request.data.get('folder'))
        except _FolderNotFound:
            return Response({"error": "dossier introuvable"}, status=400)
        # Contrôle d'accès (voir AccessRestriction) : pas d'upload dans un niveau que
        # l'appelant ne peut pas voir — même 404 que "dossier introuvable" pour ne pas
        # confirmer l'existence d'un dossier restreint (même logique que le rang de
        # rôle sur office-users).
        if not _user_can_access(request.user, office, dataroom, folder=folder):
            return Response({"error": "dossier introuvable"}, status=404)
        document = Document.objects.create(dataroom=dataroom, folder=folder, name=upload.name, file=upload)
        return Response(
            {"id": document.id, "name": document.name, "file": document.file.url, "tags": []},
            status=201,
        )

    # Sans ?folder=, ne liste que les documents à la racine de la dataroom (folder=None)
    # — pas tous les documents de la dataroom quel que soit leur dossier. Voir
    # folders_view pour lister le contenu (dossiers + documents) d'un niveau donné.
    try:
        folder = _resolve_folder(dataroom, request.GET.get('folder'))
    except _FolderNotFound:
        return Response({"error": "dossier introuvable"}, status=404)
    # _level_visible (pas _user_can_access) : la lecture profite de la visibilité de
    # chemin, contrairement à l'upload ci-dessus qui reste gaté par l'accès direct
    # seul (voir _level_visible).
    if not _level_visible(request.user, office, dataroom, folder=folder):
        return Response({"error": "dossier introuvable"}, status=404)
    wanted_tags = _requested_tag_filter(request)
    documents = dataroom.documents.filter(folder=folder).order_by('-uploaded_at').prefetch_related('tags')
    return Response([
        {"id": d.id, "name": d.name, "file": d.file.url, "uploaded_at": d.uploaded_at,
         "tags": _tags_of(d)}
        for d in documents
        if _user_can_access(request.user, office, dataroom, folder=folder, document=d)
        and _matches_tag_filter(d, wanted_tags)
    ])

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def folders_view(request, dataroom_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error

    if request.method == 'POST':
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        try:
            parent = _resolve_folder(dataroom, request.data.get('parent'))
        except _FolderNotFound:
            return Response({"error": "dossier parent introuvable"}, status=400)
        # Contrôle d'accès : pas de création dans un niveau que l'appelant ne peut pas
        # voir — même raisonnement que documents_view (404, pas 403).
        if not _user_can_access(request.user, office, dataroom, folder=parent):
            return Response({"error": "dossier parent introuvable"}, status=404)
        folder = Folder.objects.create(dataroom=dataroom, parent=parent, name=name)
        return Response(
            {"id": folder.id, "name": folder.name, "parent": parent.id if parent else None}, status=201
        )

    # Contenu d'un niveau = sous-dossiers + documents directement enfants de `parent`
    # (racine de la dataroom si absent) — une seule réponse combinée plutôt que deux
    # appels séparés, pour représenter directement un niveau de l'arborescence.
    try:
        parent = _resolve_folder(dataroom, request.GET.get('parent'))
    except _FolderNotFound:
        return Response({"error": "dossier introuvable"}, status=404)
    # _level_visible (pas _user_can_access) : la lecture profite de la visibilité de
    # chemin, contrairement à la création ci-dessus qui reste gatée par l'accès
    # direct seul (voir _level_visible).
    if not _level_visible(request.user, office, dataroom, folder=parent):
        return Response({"error": "dossier introuvable"}, status=404)
    folders = Folder.objects.filter(dataroom=dataroom, parent=parent).order_by('name')
    documents = dataroom.documents.filter(folder=parent).order_by('-uploaded_at').prefetch_related('tags')
    return Response({
        "folders": [
            {"id": f.id, "name": f.name, "created_at": f.created_at}
            for f in folders
            # _level_visible, pas _user_can_access : un sous-dossier qui ne mène nulle
            # part d'accessible reste masqué, mais un sous-dossier de transit vers un
            # élément accordé plus profond doit apparaître (visibilité de chemin).
            if _level_visible(request.user, office, dataroom, folder=f)
        ],
        "documents": [
            {"id": d.id, "name": d.name, "file": d.file.url, "uploaded_at": d.uploaded_at,
             "tags": _tags_of(d)}
            for d in documents
            if _user_can_access(request.user, office, dataroom, folder=parent, document=d)
        ],
    })

# Recherche globale. Le seuil est à 1 : on cherche dès la première lettre (demandé le
# 31/08/2026 — attendre le deuxième caractère donnait l'impression d'un champ mort).
# Seul le vide est écarté, sans quoi ouvrir la palette listerait tout l'office. Ce qui
# protège la lisibilité, ce n'est donc pas le seuil mais la limite par type : au-delà
# de 10 résultats la palette cesse d'être lisible, et le drapeau `truncated` dit à
# l'interface d'inviter à préciser plutôt que de laisser croire à une liste complète.
SEARCH_MIN_LENGTH = 1
SEARCH_LIMIT_PER_KIND = 10

def _name_starts_with(query):
    """Filtre « le nom contient un MOT qui commence par `query` » (décidé le
    31/08/2026, en remplacement d'un `icontains` qui faisait remonter « Succession
    Martin » pour la lettre « e »).

    Début de mot et pas début du nom complet : les pièces notariales s'appellent
    « Acte de notoriete.pdf » ou « Vente Guerin - 8 avenue Foch », et exiger le
    premier mot obligerait à connaître le début exact du nom pour retrouver quoi que
    ce soit. Taper « notoriete » ou « foch » doit marcher.

    Implémenté en `iregex` plutôt qu'en Python : le filtrage doit rester en base,
    sinon la fenêtre de scan (voir `scan_limit`) se remplirait de noms qui seront
    ensuite écartés, et des résultats valides tomberaient hors fenêtre. Django
    fournit bien REGEXP à SQLite (fonction Python enregistrée sur la connexion) —
    lent en théorie, sans conséquence à l'échelle d'un office de POC.

    La classe de séparateurs est définie en NÉGATIF (tout ce qui n'est ni lettre ni
    chiffre ni accent) : les noms de fichiers séparent les mots par espace, tiret,
    underscore, point, apostrophe... les énumérer serait en oublier.
    """
    return r'(^|[^0-9A-Za-zÀ-ÖØ-öø-ÿ])' + re.escape(query)

def _folder_path_labels(folder):
    """Noms des dossiers de la racine de la dataroom jusqu'à `folder` inclus.

    Garde-fou `seen` : `Folder.parent` est une FK vers self sans contrainte
    anti-cycle en base — un cycle introduit à la main (shell Django, fixture) ferait
    boucler la remontée à l'infini et gèlerait la requête plutôt que d'échouer.
    """
    labels = []
    node = folder
    seen = set()
    while node is not None and node.id not in seen:
        seen.add(node.id)
        labels.append(node.name)
        node = node.parent
    return list(reversed(labels))

# Les deux seuls types de résultats qui peuvent remonter par DEUX chemins (leur nom ou
# un de leurs tags) : la construction du dict est factorisée pour que les deux passages
# ne puissent pas diverger — un `path` calculé deux fois finirait par ne plus être le
# même. `matched_tag` reste None sur une correspondance par nom : c'est la palette qui
# décide d'afficher une justification, elle ne doit pas avoir à la deviner.
def _dataroom_hit(dataroom, matched_tag=None):
    return {
        "kind": "dataroom",
        "id": dataroom.id,
        "name": dataroom.name,
        "dataroom_id": dataroom.id,
        "dataroom_name": dataroom.name,
        "folder_id": None,
        "path": dataroom.name,
        "matched_tag": matched_tag,
    }

def _document_hit(document, matched_tag=None):
    # `folder_id` pointe le dossier CONTENANT la pièce (None = racine) : c'est le
    # niveau que l'interface doit ouvrir pour la montrer, pas la pièce elle-même.
    path_labels = _folder_path_labels(document.folder) if document.folder else []
    return {
        "kind": "document",
        "id": document.id,
        "name": document.name,
        "dataroom_id": document.dataroom_id,
        "dataroom_name": document.dataroom.name,
        "folder_id": document.folder_id,
        "path": " / ".join([document.dataroom.name, *path_labels, document.name]),
        "matched_tag": matched_tag,
    }

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_view(request):
    """Recherche par nom sur les dossiers (Dataroom), sous-dossiers (Folder), pièces
    (Document) et personnes (OfficeMembership) de l'office courant.

    Portée : la base du tenant résolu par le sous-domaine, comme tout modèle métier —
    aucun paramètre d'entrée ne permet de désigner un autre office, l'isolation vient
    du routeur de base de données, pas d'un filtre applicatif (voir CLAUDE.md,
    « Architecture multi-tenant »).

    Contrôle d'accès : STRICTEMENT les mêmes helpers que les endpoints de lecture
    existants, pas une seconde implémentation qui pourrait diverger —
    `_level_visible` pour les datarooms et les dossiers (visibilité de chemin
    incluse : un dossier de transit vers un contenu accordé plus profond reste
    trouvable), `_user_can_access` pour les documents (accès direct seul). Une
    recherche ne doit jamais servir de contournement à une AccessRestriction, ni
    révéler par un simple compteur l'existence d'une pièce restreinte.

    Correspondance : début de mot, pas sous-chaîne quelconque — voir
    `_name_starts_with`. Elle porte sur le nom des éléments ET sur le nom de leurs
    TAGS : taper « vente » remonte les dossiers et pièces étiquetés « Vente » en plus
    de ceux qui portent ce mot dans leur nom (01/09/2026 — jusque-là le filtre par tag
    n'existait que dans le menu de la liste des dossiers, hors de portée de la
    palette). Les éléments trouvés par leur tag portent `matched_tag` : sans lui, la
    palette afficherait un nom où la frappe est introuvable, et le résultat paraîtrait
    arbitraire.

    Limite connue : la casse n'est repliée que pour l'ASCII — « ERIC » trouve
    « eric », mais « ÉRIC » ne trouve pas « éric ». Accepté tel quel pour le POC
    (une vraie insensibilité aux accents demanderait une collation personnalisée ou
    un index de recherche dédié).
    """
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    query = (request.GET.get('q') or '').strip()
    if len(query) < SEARCH_MIN_LENGTH:
        # Pas une erreur : la frappe passe forcément par 1 caractère. Réponse vide
        # explicite, l'interface n'a pas à connaître le seuil pour se taire.
        return Response({"query": query, "results": [], "truncated": False})

    user = request.user
    name_pattern = _name_starts_with(query)
    results = []
    truncated = False

    # Le filtrage d'accès se fait en Python : les restrictions ne sont pas
    # exprimables en SQL ici (`user_ids` est un JSONField, et l'héritage remonte la
    # hiérarchie des dossiers). On ne peut donc pas trancher en base — on borne large,
    # puis on coupe après filtrage.
    scan_limit = SEARCH_LIMIT_PER_KIND * 5

    def take(rows, is_visible):
        """Filtre par accès, coupe à la limite d'affichage, et dit s'il MANQUE des
        résultats — deux raisons possibles, toutes deux signalées : plus d'éléments
        accessibles que la limite, ou fenêtre de scan déjà pleine avant filtrage.
        Sans ce second cas, une recherche large annoncerait une liste complète alors
        que la coupe a eu lieu en base, avant même de regarder les droits."""
        rows = list(rows)
        window_full = len(rows) > scan_limit
        visible = [row for row in rows[:scan_limit] if is_visible(row)]
        return visible[:SEARCH_LIMIT_PER_KIND], window_full or len(visible) > SEARCH_LIMIT_PER_KIND

    # scan_limit + 1 : la ligne excédentaire n'est jamais affichée, elle sert
    # uniquement à savoir que la fenêtre était pleine.
    matched_datarooms, cut = take(
        Dataroom.objects.filter(name__iregex=name_pattern).order_by('name')[:scan_limit + 1],
        lambda d: _level_visible(user, office, d),
    )
    truncated = truncated or cut
    results.extend(_dataroom_hit(d) for d in matched_datarooms)

    matched_folders, cut = take(
        Folder.objects.filter(name__iregex=name_pattern)
        .select_related('dataroom', 'parent')
        .order_by('name')[:scan_limit + 1],
        lambda f: _level_visible(user, office, f.dataroom, folder=f),
    )
    truncated = truncated or cut
    for f in matched_folders:
        results.append({
            "kind": "folder",
            "id": f.id,
            "name": f.name,
            "dataroom_id": f.dataroom_id,
            "dataroom_name": f.dataroom.name,
            "folder_id": f.id,
            "path": " / ".join([f.dataroom.name, *_folder_path_labels(f)]),
            # Toujours None : un Folder ne porte pas de tags (M2M déclarés côté
            # Dataroom et Document seulement, voir models.py). Le champ est quand même
            # présent pour que la forme d'un résultat ne dépende pas de son type.
            "matched_tag": None,
        })

    matched_documents, cut = take(
        Document.objects.filter(name__iregex=name_pattern)
        .select_related('dataroom', 'folder')
        .order_by('-uploaded_at')[:scan_limit + 1],
        lambda d: _user_can_access(user, office, d.dataroom, folder=d.folder, document=d),
    )
    truncated = truncated or cut
    results.extend(_document_hit(d) for d in matched_documents)

    # Correspondance par TAG, en second passage plutôt qu'en OR dans les requêtes
    # ci-dessus : l'élément doit dire POURQUOI il remonte, et un OR rendrait la
    # provenance indiscernable. Les `exclude(name__iregex=...)` garantissent qu'un
    # élément ne remonte jamais deux fois — la correspondance par nom l'emporte, y
    # compris quand elle a été coupée par la limite d'affichage (exclure les seuls
    # éléments déjà émis laisserait ressortir un dossier tronqué du passage précédent).
    #
    # Seuls Dataroom et Document sont concernés : ni Folder ni OfficeMembership ne
    # portent de tags. Et un élément ne remonte que par SES tags, pas par ceux du
    # dossier qui le contient : « toutes les pièces d'un dossier Vente » est une
    # question de navigation (ouvrir le dossier), pas de recherche.
    #
    # Limite par type propre à ce passage, non partagée avec celui par nom : une étude
    # qui étiquette large ne doit pas pouvoir chasser de la palette les éléments dont
    # c'est le nom même qui correspond.
    matching_tags = list(Tag.objects.filter(name__iregex=name_pattern))
    if matching_tags:
        tag_ids = {t.id for t in matching_tags}

        def justifying_tag(obj):
            """Le tag à AFFICHER quand l'élément en porte plusieurs qui correspondent :
            le premier par nom (Tag.Meta.ordering), pour que deux recherches identiques
            n'affichent pas deux justifications différentes."""
            for tag in obj.tags.all():
                if tag.id in tag_ids:
                    return _serialize_tag(tag)
            # Inatteignable — l'élément vient d'un filtre sur ces mêmes tags. Retour
            # explicite plutôt qu'un None implicite, pour que la palette reçoive au pire
            # un résultat sans justification, pas une exception.
            return None

        tagged_datarooms, cut = take(
            Dataroom.objects.filter(tags__in=matching_tags)
            .exclude(name__iregex=name_pattern)
            .prefetch_related('tags')
            .distinct()
            .order_by('name')[:scan_limit + 1],
            lambda d: _level_visible(user, office, d),
        )
        truncated = truncated or cut
        results.extend(_dataroom_hit(d, justifying_tag(d)) for d in tagged_datarooms)

        tagged_documents, cut = take(
            Document.objects.filter(tags__in=matching_tags)
            .exclude(name__iregex=name_pattern)
            .select_related('dataroom', 'folder')
            .prefetch_related('tags')
            .distinct()
            .order_by('-uploaded_at')[:scan_limit + 1],
            # Rigoureusement le même contrôle que le passage par nom : un tag ne doit
            # pas devenir un chemin de traverse vers une pièce restreinte.
            lambda d: _user_can_access(user, office, d.dataroom, folder=d.folder, document=d),
        )
        truncated = truncated or cut
        results.extend(_document_hit(d, justifying_tag(d)) for d in tagged_documents)

    # Les personnes de l'étude. Volontairement soumises au MÊME gate et à la MÊME
    # visibilité hiérarchique que /api/office-users/ : réservé aux admins/superadmins
    # de cet office, et un admin ne voit pas les superadmins. Un non-gestionnaire ne
    # reçoit simplement aucune personne — pas un 403 sur toute la recherche, qui
    # priverait un membre ordinaire de la recherche de ses propres dossiers.
    caller_role = _manager_role(user, office)
    if caller_role is not None:
        visible_roles = _roles_at_or_below(OfficeMembership.ROLE_RANK[caller_role])
        matched_people, cut = take(
            OfficeMembership.objects.filter(
                office=office, role__in=visible_roles, user__username__iregex=name_pattern
            ).select_related('user').order_by('user__username')[:scan_limit + 1],
            # Le filtre d'accès est déjà entièrement exprimé en SQL ici (office + rang),
            # contrairement aux modèles tenant dont les restrictions ne le sont pas.
            lambda m: True,
        )
        truncated = truncated or cut
        for m in matched_people:
            results.append({
                "kind": "person",
                # L'id du MEMBERSHIP, pas celui du User : c'est la clé que manipule
                # déjà /api/office-users/<id>/, et un compte peut appartenir à
                # plusieurs offices.
                "id": m.id,
                "name": m.user.username,
                "dataroom_id": None,
                "dataroom_name": None,
                "folder_id": None,
                "path": f"{office.name} / {m.get_role_display()}",
                # Toujours None, comme pour les sous-dossiers : une personne ne porte
                # pas de tags.
                "matched_tag": None,
            })

    return Response({"query": query, "results": results, "truncated": truncated})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_content_view(request, dataroom_id, document_id):
    """Sert le contenu binaire d'un document, pour l'affichage dans l'application.

    Pourquoi passer par Django plutôt que par l'URL du stockage : `document.file.url`
    est une URL MinIO signée en `http://localhost:9000`, alors que l'application est
    servie en HTTPS — le navigateur bloque le contenu mixte, l'aperçu resterait vide.
    Ce relais règle aussi un problème de fond : le fichier repasse par les MÊMES
    contrôles d'accès que sa fiche (_user_can_access), au lieu de circuler sous forme
    d'une URL signée que n'importe qui pourrait rejouer tant qu'elle est valide.

    `Content-Disposition: inline` : le navigateur affiche au lieu de télécharger. Le
    téléchargement reste possible depuis le lecteur PDF ou le bouton de la fiche.
    """
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    dataroom, error = _dataroom_or_404(dataroom_id)
    if error:
        return error

    document = dataroom.documents.filter(pk=document_id).first()
    # 404 et non 403 quand l'accès est refusé : même logique que le reste du contrôle
    # d'accès (voir _resolve_folder), on ne confirme pas l'existence d'une pièce que
    # l'utilisateur n'a pas le droit de voir.
    if document is None or not _user_can_access(
        request.user, office, dataroom, folder=document.folder, document=document
    ):
        return Response({"error": "document introuvable"}, status=404)

    content_type = mimetypes.guess_type(document.name)[0] or "application/octet-stream"
    response = FileResponse(document.file.open('rb'), content_type=content_type)
    # filename* (RFC 5987) : les noms de pièces notariales sont pleins d'accents, et
    # un en-tête non ASCII casse la réponse chez certains navigateurs.
    response["Content-Disposition"] = (
        f"inline; filename*=UTF-8''{quote(document.name)}"
    )
    return response

def _serialize_template(t):
    return {"id": t.id, "name": t.name, "description": t.description, "created_at": t.created_at}

def _serialize_template_folder(f):
    return {
        "id": f.id, "name": f.name, "parent": f.parent_id, "visible_to_roles": f.visible_to_roles,
    }

def _template_or_404(template_id):
    try:
        return Template.objects.get(pk=template_id), None
    except Template.DoesNotExist:
        return None, Response({"error": "modèle introuvable"}, status=404)

def _resolve_template_folder(template, raw_folder_id):
    """Même patron que _resolve_folder, scopé à `template` au lieu de `dataroom` —
    un id de TemplateFolder valide mais appartenant à un AUTRE Template n'est pas
    accepté comme parent. None (id absent) = racine du template."""
    if not raw_folder_id:
        return None
    try:
        return TemplateFolder.objects.get(pk=raw_folder_id, template=template)
    except TemplateFolder.DoesNotExist:
        raise _FolderNotFound

def _clean_roles(raw_roles):
    """Filtre `raw_roles` aux seules clés valides de OfficeMembership.ROLE_RANK,
    silencieusement (même défense en profondeur que _set_restriction pour
    user_ids) — un rôle inconnu envoyé par erreur n'empêche pas la création, il
    est juste ignoré plutôt que de faire échouer toute la requête."""
    if not isinstance(raw_roles, list):
        return []
    seen = []
    for role in raw_roles:
        if role in OfficeMembership.ROLE_RANK and role not in seen:
            seen.append(role)
    return seen

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def templates_view(request):
    """Gestion des modèles de dataroom de l'office courant — réservé aux
    admins/superadmins, même gate que la gestion des utilisateurs (_manager_role).
    Pas de filtre `office=` sur la requête ORM : Template vit dans la base tenant,
    déjà scopée implicitement par la connexion (même patron que Dataroom dans
    datarooms_view)."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    if request.method == 'POST':
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        description = request.data.get('description') or ''
        template = Template.objects.create(name=name, description=description)
        return Response(_serialize_template(template), status=201)

    templates = Template.objects.order_by('name')
    return Response([_serialize_template(t) for t in templates])

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def template_detail_view(request, template_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    template, error = _template_or_404(template_id)
    if error:
        return error

    if request.method == 'DELETE':
        template.delete()
        return Response(status=204)

    if 'name' in request.data:
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        template.name = name
    if 'description' in request.data:
        template.description = request.data.get('description') or ''
    template.save()
    return Response(_serialize_template(template))

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def template_folders_view(request, template_id):
    """Même patron que folders_view, mais un template n'a que des dossiers — pas
    de "documents" dans la réponse GET."""
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    template, error = _template_or_404(template_id)
    if error:
        return error

    if request.method == 'POST':
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        try:
            parent = _resolve_template_folder(template, request.data.get('parent'))
        except _FolderNotFound:
            return Response({"error": "dossier parent introuvable"}, status=400)
        visible_to_roles = _clean_roles(request.data.get('visible_to_roles') or [])
        folder = TemplateFolder.objects.create(
            template=template, parent=parent, name=name, visible_to_roles=visible_to_roles
        )
        return Response(_serialize_template_folder(folder), status=201)

    try:
        parent = _resolve_template_folder(template, request.GET.get('parent'))
    except _FolderNotFound:
        return Response({"error": "dossier introuvable"}, status=404)
    folders = TemplateFolder.objects.filter(template=template, parent=parent).order_by('name')
    return Response({"folders": [_serialize_template_folder(f) for f in folders]})

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def template_folder_detail_view(request, template_id, folder_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if _manager_role(request.user, office) is None:
        return Response({"error": "réservé aux administrateurs de cet office"}, status=403)

    template, error = _template_or_404(template_id)
    if error:
        return error
    try:
        folder = TemplateFolder.objects.get(pk=folder_id, template=template)
    except TemplateFolder.DoesNotExist:
        return Response({"error": "dossier introuvable"}, status=404)

    if request.method == 'DELETE':
        folder.delete()
        return Response(status=204)

    if 'name' in request.data:
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        folder.name = name
    if 'visible_to_roles' in request.data:
        folder.visible_to_roles = _clean_roles(request.data.get('visible_to_roles') or [])
    folder.save()
    return Response(_serialize_template_folder(folder))

def _is_hyperadmin(user):
    """Rôle Notantis TRANSVERSE à tous les offices — voir HyperadminAccess
    (models.py). Contrairement à _manager_role, ne dépend d'AUCUN office
    précis : les routes /api/hyperadmin/... restent utilisables depuis
    n'importe quel sous-domaine d'office où l'appelant a une session active,
    volontairement (pas de sous-domaine dédié dans cette première version, voir
    CLAUDE.md)."""
    return HyperadminAccess.objects.filter(user=user).exists()

def _serialize_office(o):
    return {
        "id": o.id,
        "subdomain": o.subdomain,
        "name": o.name,
        "is_active": o.is_active,
        "enabled_modules": list(o.enabled_modules.values_list("slug", flat=True)),
    }

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def hyperadmin_offices_view(request):
    """Interface hyperadmin — liste/crée des Office. Réservé aux hyperadmins
    (_is_hyperadmin), pas aux superadmin d'office (rôle distinct, voir
    HyperadminAccess)."""
    if not _is_hyperadmin(request.user):
        return Response({"error": "réservé aux hyperadmins Notantis"}, status=403)

    if request.method == 'POST':
        subdomain = (request.data.get('subdomain') or '').strip().lower()
        name = (request.data.get('name') or '').strip()
        admin_mode = request.data.get('admin_mode')
        admin_username = (request.data.get('admin_username') or '').strip()
        admin_password = request.data.get('admin_password') or ''

        # Validation COMPLÈTE avant toute écriture — pas de création partielle
        # (office sans admin, ou admin sans office) en cas d'erreur à mi-chemin.
        office = Office(subdomain=subdomain, name=name)
        try:
            office.full_clean()
        except ValidationError as exc:
            # exc.messages aplatit déjà error_dict/error_list en une seule liste,
            # peu importe la forme de l'erreur levée par full_clean().
            return Response({"error": "; ".join(exc.messages)}, status=400)

        if admin_mode not in ('create', 'attach'):
            return Response({"error": "admin_mode invalide"}, status=400)
        if not admin_username:
            return Response({"error": "nom d'utilisateur de l'administrateur requis"}, status=400)

        if admin_mode == 'create':
            if User.objects.filter(username=admin_username).exists():
                return Response({"error": "nom d'utilisateur déjà utilisé"}, status=400)
            try:
                validate_password(admin_password)
            except ValidationError as exc:
                return Response({"error": " ".join(exc.messages)}, status=400)
            admin_user = None  # créé après l'office, voir plus bas
        else:
            admin_user = User.objects.filter(username=admin_username).first()
            if admin_user is None:
                # Message générique, comme attach_office_user_view : ne confirme
                # ni n'infirme l'existence du compte ailleurs dans le système.
                return Response({"error": "utilisateur introuvable"}, status=404)

        office.save()
        if admin_mode == 'create':
            admin_user = User.objects.create_user(username=admin_username, password=admin_password)
        OfficeMembership.objects.create(user=admin_user, office=office, role="admin")

        # Provisionne + migre la base tenant de ce seul office — même corps que
        # la boucle de migrate_all_tenants.py, appliqué à cet office précis.
        alias = ensure_tenant_registered(office.subdomain)
        call_command("migrate", database=alias, verbosity=0)

        return Response(_serialize_office(office), status=201)

    offices = Office.objects.order_by('name')
    return Response([_serialize_office(o) for o in offices])

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def hyperadmin_office_detail_view(request, office_id):
    """Active/désactive un office et/ou gère ses modules activés — réutilise
    Office.is_active et Office.enabled_modules déjà existants, juste une
    interface qui évite de passer par /admin/ Django."""
    if not _is_hyperadmin(request.user):
        return Response({"error": "réservé aux hyperadmins Notantis"}, status=403)

    try:
        office = Office.objects.get(pk=office_id)
    except Office.DoesNotExist:
        return Response({"error": "office introuvable"}, status=404)

    if 'is_active' in request.data:
        office.is_active = bool(request.data.get('is_active'))
    if 'enabled_module_slugs' in request.data:
        slugs = request.data.get('enabled_module_slugs') or []
        # Slugs inconnus silencieusement ignorés (défense en profondeur, même
        # patron que _clean_roles/_set_restriction) — pas de rejet bloquant.
        office.enabled_modules.set(Module.objects.filter(slug__in=slugs))
    office.save()
    return Response(_serialize_office(office))
