from .context import get_current_tenant

# Apps Django/tiers dont les modèles restent toujours sur la base "default"
# (comptes, sessions, tokens...) — voir CLAUDE.md, section Architecture multi-tenant.
SHARED_APPS = {"admin", "auth", "contenttypes", "sessions", "authtoken"}

# Modèles de l'app "datarooms" qui sont des données transverses (registre des offices,
# des modules, des appartenances) et non des données métier propres à un office.
SHARED_MODELS = {
    ("datarooms", "module"),
    ("datarooms", "office"),
    ("datarooms", "officemembership"),
    # Table M2M implicite générée par Office.enabled_modules (pas de through= explicite) —
    # doit rester partagée comme Office/Module eux-mêmes, sinon toute modification des
    # modules activés d'un office échoue dès qu'elle est faite via un sous-domaine réel
    # (ex: /admin/ sur officea.localhost:8000), le ContextVar de tenant étant alors réel.
    ("datarooms", "office_enabled_modules"),
}
# Dataroom et Document sont volontairement ABSENTS de cet ensemble : ce sont des modèles
# métier tenant (voir models.py), ils doivent rester routés vers la base de l'office
# courant (via get_current_tenant()) et non vers "default".


class MissingTenantContext(Exception):
    """Levée quand un modèle tenant est accédé sans tenant résolu pour la requête."""


class TenantRouter:
    def _is_shared(self, app_label, model_name):
        if app_label in SHARED_APPS:
            return True
        if model_name is None:
            return None
        return (app_label, model_name) in SHARED_MODELS

    def _db_for(self, model):
        app_label, model_name = model._meta.app_label, model._meta.model_name
        if self._is_shared(app_label, model_name):
            return "default"
        tenant = get_current_tenant()
        if tenant is None:
            raise MissingTenantContext(f"Aucun tenant résolu pour {app_label}.{model_name}")
        return tenant.alias

    def db_for_read(self, model, **hints):
        return self._db_for(model)

    def db_for_write(self, model, **hints):
        return self._db_for(model)

    def allow_relation(self, obj1, obj2, **hints):
        s1 = self._is_shared(obj1._meta.app_label, obj1._meta.model_name)
        s2 = self._is_shared(obj2._meta.app_label, obj2._meta.model_name)
        return True if s1 == s2 else None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        is_shared = self._is_shared(app_label, model_name)
        if is_shared is None:
            return None
        return is_shared if db == "default" else not is_shared
