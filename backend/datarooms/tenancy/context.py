from contextvars import ContextVar
from dataclasses import dataclass


@dataclass(frozen=True)
class TenantContext:
    subdomain: str
    alias: str


_current_tenant: ContextVar["TenantContext | None"] = ContextVar("current_tenant", default=None)


def set_current_tenant(tenant: TenantContext):
    return _current_tenant.set(tenant)


def reset_current_tenant(token):
    _current_tenant.reset(token)


def get_current_tenant():
    return _current_tenant.get()
