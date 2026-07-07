from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.middleware import (
    RequestLoggingMiddleware,
    app_exception_handler,
    generic_exception_handler,
    setup_logging,
)
from app.core.rate_limit import limiter
from app.routers import (
    admin_crud,
    auth,
    core_modules,
    dashboard_reports,
    files_receipts,
    health,
    organizations,
    users,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(
    title="EduPanel API",
    description="Anaokulu, kreş, etüt ve kurs merkezleri yönetim sistemi",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(users.router)
app.include_router(admin_crud.router)
app.include_router(core_modules.router)
app.include_router(dashboard_reports.router)
app.include_router(files_receipts.router)
