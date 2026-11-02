from alembic import context

from app.db import engine
from app.models import Base

if context.is_offline_mode():
    context.configure(
        url=engine.url, target_metadata=Base.metadata, literal_binds=True, include_schemas=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    with engine.connect() as connection:
        context.configure(
            connection=connection, target_metadata=Base.metadata, include_schemas=True
        )
        with context.begin_transaction():
            context.run_migrations()
