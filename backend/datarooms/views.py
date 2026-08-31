import mimetypes
from urllib.parse import quote

from django.contrib.auth import authenticate, get_user_model, login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import FileResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render

from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .mfa import qr_code_data_uri
from .models import AccessRestriction, Dataroom, Document, Folder, Office, OfficeMembership
from .tenancy.sso import consume_ticket, issue_ticket
from .validators import ThemeValidationError, clean_theme_payload, is_accepted_extension

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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def datarooms_view(request):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    if request.method == 'POST':
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({"error": "nom requis"}, status=400)
        dataroom = Dataroom.objects.create(name=name)
        return Response({"id": dataroom.id, "name": dataroom.name}, status=201)

    datarooms = Dataroom.objects.order_by('-created_at')
    return Response([
        {"id": d.id, "name": d.name, "created_at": d.created_at}
        for d in datarooms
        if _level_visible(request.user, d)
    ])

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

def _user_can_access(user, dataroom, folder=None, document=None):
    restriction = _nearest_restriction(dataroom, folder=folder, document=document)
    return restriction is None or user.id in restriction.user_ids

def _subtree_has_accessible_content(user, dataroom, folder=None):
    """True si le sous-arbre ENFANT de `folder` (racine de la dataroom si None) —
    donc son contenu, pas `folder` lui-même — contient, à n'importe quelle
    profondeur, au moins un Document ou Folder directement accessible à `user`
    (_user_can_access, héritage inchangé). Récursion explicite, séparée de
    _nearest_restriction/_user_can_access pour ne jamais risquer de modifier leur
    comportement déjà testé — sert uniquement à calculer une VISIBILITÉ DE CHEMIN
    (voir _level_visible), jamais à muter une restriction. Pas de cache/
    précalcul : recalculée à chaque requête, taille attendue d'une dataroom de POC."""
    for d in Document.objects.filter(dataroom=dataroom, folder=folder):
        if _user_can_access(user, dataroom, folder=folder, document=d):
            return True
    for f in Folder.objects.filter(dataroom=dataroom, parent=folder):
        if _level_visible(user, dataroom, folder=f):
            return True
    return False

def _level_visible(user, dataroom, folder=None):
    """Un Dataroom (folder=None) ou un Folder est visible si l'utilisateur y a un
    accès direct (_user_can_access, héritage inchangé — restreint davantage un
    contenu par ailleurs ouvert), OU si son sous-arbre contient à n'importe quelle
    profondeur un élément directement accessible via une restriction plus précise
    (visibilité de CHEMIN — permet de naviguer jusqu'à un document imbriqué même à
    travers des niveaux par ailleurs fermés, y compris la dataroom elle-même).
    Ne mute jamais aucune restriction (voir _subtree_has_accessible_content) :
    recalculée à chaque requête à partir des restrictions telles qu'explicitement
    configurées à chaque niveau — c'est pour ça que lister un niveau ne montre que
    les éléments directement accessibles PLUS les sous-dossiers qui MÈNENT vers un
    accès plus profond, jamais le reste du contenu de ces sous-dossiers de transit
    (voir l'usage dans folders_view/documents_view/datarooms_view — uniquement les
    endpoints de LECTURE ; la création/l'upload restent gatés par _user_can_access
    seul, la visibilité de chemin n'étend jamais un droit d'écriture)."""
    return _user_can_access(user, dataroom, folder=folder) or _subtree_has_accessible_content(
        user, dataroom, folder=folder
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
        if not _user_can_access(request.user, dataroom, folder=folder):
            return Response({"error": "dossier introuvable"}, status=404)
        document = Document.objects.create(dataroom=dataroom, folder=folder, name=upload.name, file=upload)
        return Response({"id": document.id, "name": document.name, "file": document.file.url}, status=201)

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
    if not _level_visible(request.user, dataroom, folder=folder):
        return Response({"error": "dossier introuvable"}, status=404)
    documents = dataroom.documents.filter(folder=folder).order_by('-uploaded_at')
    return Response([
        {"id": d.id, "name": d.name, "file": d.file.url, "uploaded_at": d.uploaded_at}
        for d in documents
        if _user_can_access(request.user, dataroom, folder=folder, document=d)
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
        if not _user_can_access(request.user, dataroom, folder=parent):
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
    if not _level_visible(request.user, dataroom, folder=parent):
        return Response({"error": "dossier introuvable"}, status=404)
    folders = Folder.objects.filter(dataroom=dataroom, parent=parent).order_by('name')
    documents = dataroom.documents.filter(folder=parent).order_by('-uploaded_at')
    return Response({
        "folders": [
            {"id": f.id, "name": f.name, "created_at": f.created_at}
            for f in folders
            # _level_visible, pas _user_can_access : un sous-dossier qui ne mène nulle
            # part d'accessible reste masqué, mais un sous-dossier de transit vers un
            # élément accordé plus profond doit apparaître (visibilité de chemin).
            if _level_visible(request.user, dataroom, folder=f)
        ],
        "documents": [
            {"id": d.id, "name": d.name, "file": d.file.url, "uploaded_at": d.uploaded_at}
            for d in documents
            if _user_can_access(request.user, dataroom, folder=parent, document=d)
        ],
    })

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
        request.user, dataroom, folder=document.folder, document=document
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
