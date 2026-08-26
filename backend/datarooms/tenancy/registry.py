from django.conf import settings
from django.db import connections


def tenant_alias(subdomain: str) -> str:
    return f"tenant_{subdomain.lower()}"


def tenant_db_path(subdomain: str):
    return settings.TENANT_DB_DIR / f"{subdomain.lower()}.sqlite3"


def ensure_tenant_registered(subdomain: str) -> str:
    """Enregistre l'alias DB pour un subdomain déjà CONFIRMÉ en base default.

    Ne jamais appeler avec une entrée brute non validée : le chemin fichier est
    dérivé du subdomain, donc un appelant doit avoir vérifié au préalable qu'il
    correspond à une ligne Office réelle (voir tenancy/middleware.py).
    """
    alias = tenant_alias(subdomain)
    if alias not in connections.databases:
        settings.TENANT_DB_DIR.mkdir(parents=True, exist_ok=True)
        connections.databases[alias] = {
            **settings.DATABASES["default"],
            "NAME": str(tenant_db_path(subdomain)),
        }
    return alias
