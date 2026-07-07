from collections.abc import Callable
from functools import wraps

from fastapi import Depends

from app.core.dependencies import get_tenant_context
from app.core.exceptions import ForbiddenException
from app.core.tenant import TenantContext


def require_permission(*permissions: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, tenant: TenantContext = None, **kwargs):
            if tenant is None:
                tenant = kwargs.get("tenant")
            if tenant is None:
                raise ForbiddenException()
            if not tenant.has_any_permission(list(permissions)):
                raise ForbiddenException(f"Gerekli yetki: {', '.join(permissions)}")
            return await func(*args, **kwargs)

        return wrapper

    return decorator


class PermissionChecker:
    def __init__(self, *permissions: str):
        self.permissions = permissions

    async def __call__(self, tenant: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if not tenant.has_any_permission(list(self.permissions)):
            raise ForbiddenException(f"Gerekli yetki: {', '.join(self.permissions)}")
        return tenant
