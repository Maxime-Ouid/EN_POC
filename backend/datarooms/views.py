from django.shortcuts import render

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .models import Office

# Create your views here.
class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        token = Token.objects.get(key=response.data['token'])
        return Response({"token": token.key, "username": token.user.username})

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
    subdomain = request.GET.get('office')
    if not subdomain:
        return Response({"error": "paramètre 'office' requis"}, status=400)
    if not request.user.memberships.filter(office__subdomain=subdomain).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)

    office = Office.objects.get(subdomain=subdomain)
    return Response({
        "name": office.name,
        "logo_url": office.logo_url,
        "primary_color": office.primary_color,
        "enabled_modules": list(office.enabled_modules.values_list('slug', flat=True)),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coffre_fort_view(request):
    subdomain = request.GET.get('office')
    if not request.user.memberships.filter(office__subdomain=subdomain).exists():
        return Response({"error": "accès non autorisé à cet office"}, status=403)
    office = Office.objects.get(subdomain=subdomain)
    if not office.enabled_modules.filter(slug="coffre-fort").exists():
        return Response({"error": "module non activé pour cet office"}, status=403)
    return Response({"message": "Contenu du module Coffre-fort (démo)"})