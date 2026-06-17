"""add user preferred locale

Revision ID: c2c3f4b5a6d7
Revises: 5755b2b71841
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "c2c3f4b5a6d7"
down_revision: Union[str, None] = "5755b2b71841"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("preferred_locale", sa.String(length=10), nullable=False, server_default="zh"),
    )
    op.alter_column("users", "preferred_locale", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "preferred_locale")
