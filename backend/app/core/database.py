import ssl
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# -------------------------
# SSL CONTEXT FOR RDS
# -------------------------
ssl_context = ssl.create_default_context(
    cafile="/home/ubuntu/KashiKartCiCd/backend/global-bundle.pem"
)

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
