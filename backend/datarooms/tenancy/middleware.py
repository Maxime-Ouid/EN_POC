from ..models import Office
from .context import TenantContext, reset_current_tenant, set_current_tenant
from .registry import ensure_tenant_registered


class TenantResolutionMiddleware:
    """Résout le tenant courant depuis le sous-domaine du Host de la requête
    (ex: officea.localhost:8000 -> subdomain "officea"). settings.ALLOWED_HOSTS
    garantit déjà que ce Host a une forme de confiance minimale ; ici on va plus loin
    en vérifiant que le premier label correspond à un Office réellement enregistré
    avant de résoudre quoi que ce soit — un Host inconnu retombe simplement sur
    request.office = None, jamais sur une identité devinée.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = None
        request.office = None

        host = request.get_host().split(":")[0].lower()
        labels = host.split(".")
        if len(labels) >= 2 and labels[-1] == "localhost":
            subdomain = labels[0]
            office = Office.objects.filter(subdomain=subdomain).first()
            if office is not None:
                alias = ensure_tenant_registered(office.subdomain)
                token = set_current_tenant(TenantContext(office.subdomain, alias))
                request.office = office

        try:
            return self.get_response(request)
        finally:
            if token is not None:
                reset_current_tenant(token)
