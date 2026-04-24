import ssl
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# -------------------------
# SSL CONTEXT FOR RDS
# -------------------------
import os as _os
_ssl_cert = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.dirname(__file__))), "global-bundle.pem")
ssl_context = ssl.create_default_context(cafile=_ssl_cert)

# -------------------------
# ASYNC ENGINE
# -------------------------
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
    connect_args={
        "ssl": ssl_context
    }
)

# -------------------------
# ASYNC SESSION FACTORY
# -------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# -------------------------
# BASE
# -------------------------
Base = declarative_base()

# -------------------------
# FASTAPI DEPENDENCY
# -------------------------
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
