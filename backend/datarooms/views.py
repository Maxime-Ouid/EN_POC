from django.contrib.auth import authenticate, get_user_model, login
from django.http import HttpResponseBadRequest, HttpResponseRedirect
from django.shortcuts import render

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Dataroom, Document, Office
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
    login(request, user)
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
        {"id": d.id, "name": d.name, "created_at": d.created_at} for d in datarooms
    ])

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents_view(request, dataroom_id):
    office = request.office
    if office is None:
        return Response({"error": "sous-domaine d'office non résolu"}, status=404)
    if not request.user.memberships.filter(office=office).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    try:
        dataroom = Dataroom.objects.get(pk=dataroom_id)
    except Dataroom.DoesNotExist:
        return Response({"error": "dataroom introuvable"}, status=404)

    if request.method == 'POST':
        upload = request.FILES.get('file')
        if not upload:
            return Response({"error": "fichier requis"}, status=400)
        if not is_accepted_extension(upload.name):
            return Response({"error": "format de fichier non pris en charge"}, status=400)
        document = Document.objects.create(dataroom=dataroom, name=upload.name, file=upload)
        return Response({"id": document.id, "name": document.name, "file": document.file.url}, status=201)

    documents = dataroom.documents.order_by('-uploaded_at')
    return Response([
        {"id": d.id, "name": d.name, "file": d.file.url, "uploaded_at": d.uploaded_at}
        for d in documents
    ])
