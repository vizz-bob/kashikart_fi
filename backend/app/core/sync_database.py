import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Convert async PostgreSQL URL to sync (asyncpg → psycopg2)
DATABASE_URL_SYNC = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2")

# SSL cert for RDS
_ssl_cert = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "global-bundle.pem")

engine_sync = create_engine(
    DATABASE_URL_SYNC,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "sslmode": "verify-full",
        "sslrootcert": _ssl_cert,
    }
)

SyncSessionLocal = sessionmaker(bind=engine_sync)
