from .context import get_current_tenant


def tenant_document_path(instance, filename):
    """Chemin de stockage sous MEDIA_ROOT, préfixé par le subdomain de l'office courant
    (via le même ContextVar que le routeur DB) — prolonge l'isolation déjà en place en
    base au niveau du stockage fichier, plutôt qu'un seul dossier media partagé."""
    tenant = get_current_tenant()
    if tenant is None:
        raise RuntimeError("Aucun tenant résolu : impossible de déterminer le chemin de stockage.")
    return f"{tenant.subdomain}/dataroom_{instance.dataroom_id}/{filename}"
