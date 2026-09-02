from ..models import Office
from .context import TenantContext, reset_current_tenant, set_current_tenant
from .registry import ensure_tenant_registered


class TenantResolutionMiddleware:
    """Résout le tenant courant depuis le sous-domaine du Host de la requête
    (ex: officea.localhost:8000 -> subdomain "officea"). settings.ALLOWED_HOSTS
    garantit déjà que ce Host a une forme de confiance minimale ; ici on va plus loin
    en vérifiant que le premier label correspond à un Office réellement enregistré
    ET actif avant de résoudre quoi que ce soit — un Host inconnu OU un office
    désactivé (Office.is_active=False, interface hyperadmin) retombent tous les
    deux simplement sur request.office = None, jamais sur une identité devinée.
    Un office désactivé n'est donc jamais distingué d'un sous-domaine inconnu en
    aval : aucune vue n'a besoin de connaître is_active, elles traitent déjà
    request.office is None comme "office non résolu".

    "hyperadmin.localhost" est un troisième cas, distinct des deux précédents :
    un hôte connu et légitime (le shell de l'interface hyperadmin,
    frontend/src/hyperadmin/), mais qui ne correspond JAMAIS à un Office
    (Office.RESERVED_SUBDOMAINS l'interdit à la création). Reconnu explicitement
    avant toute tentative de résolution — request.office reste None comme pour
    un Host inconnu, mais request.hyperadmin_host=True le distingue pour
    login_view, seul point qui a besoin de savoir qu'aucun office ne sera
    jamais résolu ici alors que ce n'est pas une erreur pour autant.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = None
        request.office = None
        request.hyperadmin_host = False

        host = request.get_host().split(":")[0].lower()
        labels = host.split(".")
        if len(labels) >= 2 and labels[-1] == "localhost":
            subdomain = labels[0]
            if subdomain == "hyperadmin":
                request.hyperadmin_host = True
            else:
                office = Office.objects.filter(subdomain=subdomain).first()
                if office is not None and office.is_active:
                    alias = ensure_tenant_registered(office.subdomain)
                    token = set_current_tenant(TenantContext(office.subdomain, alias))
                    request.office = office

        try:
            return self.get_response(request)
        finally:
            if token is not None:
                reset_current_tenant(token)
