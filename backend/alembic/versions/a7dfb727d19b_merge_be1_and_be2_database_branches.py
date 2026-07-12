"""Merge BE1 and BE2 database branches

Revision ID: a7dfb727d19b
Revises: ('0005_be2_fuel_expenses', '5540a2390864')
Create Date: 2026-07-12 15:09:53.333185

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7dfb727d19b'
down_revision: Union[str, None] = ('0005_be2_fuel_expenses', '5540a2390864')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
