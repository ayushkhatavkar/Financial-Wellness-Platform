"""fraudshield_integrity_schema

Revision ID: c3a4f8e12b7a
Revises: 9b826bf3bc9d
Create Date: 2026-10-30 12:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3a4f8e12b7a'
down_revision: Union[str, Sequence[str], None] = '9b826bf3bc9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns to transactions
    op.add_column('transactions', sa.Column('exclusion_reason', sa.Text(), nullable=True))
    op.add_column('transactions', sa.Column('fraud_review_status', sa.String(length=30), nullable=True))
    op.add_column('transactions', sa.Column('fraud_risk_score', sa.Numeric(precision=5, scale=2), nullable=True))

    # 2. Create fraud_analysis_runs table
    op.create_table(
        'fraud_analysis_runs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('import_id', sa.String(length=36), nullable=True),
        sa.Column('total_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('flagged_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('review_status', sa.String(length=30), nullable=False, server_default='CLEAR'),
        sa.Column('anomaly_score', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('category_counts', sa.JSON(), nullable=True),
        sa.Column('run_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['import_id'], ['statement_imports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fraud_analysis_runs_user_id'), 'fraud_analysis_runs', ['user_id'], unique=False)
    op.create_index(op.f('ix_fraud_analysis_runs_import_id'), 'fraud_analysis_runs', ['import_id'], unique=False)

    # 3. Create fraud_alerts table
    op.create_table(
        'fraud_alerts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('run_id', sa.String(length=36), nullable=True),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=True),
        sa.Column('external_ref', sa.String(length=100), nullable=True),
        sa.Column('rule_id', sa.String(length=50), nullable=False),
        sa.Column('rule_name', sa.String(length=120), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('evidence', sa.JSON(), nullable=True),
        sa.Column('review_status', sa.String(length=30), nullable=False, server_default='PENDING_REVIEW'),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['run_id'], ['fraud_analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fraud_alerts_category'), 'fraud_alerts', ['category'], unique=False)
    op.create_index(op.f('ix_fraud_alerts_rule_id'), 'fraud_alerts', ['rule_id'], unique=False)
    op.create_index(op.f('ix_fraud_alerts_run_id'), 'fraud_alerts', ['run_id'], unique=False)
    op.create_index(op.f('ix_fraud_alerts_transaction_id'), 'fraud_alerts', ['transaction_id'], unique=False)
    op.create_index(op.f('ix_fraud_alerts_user_id'), 'fraud_alerts', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('fraud_alerts')
    op.drop_table('fraud_analysis_runs')
    op.drop_column('transactions', 'fraud_risk_score')
    op.drop_column('transactions', 'fraud_review_status')
    op.drop_column('transactions', 'exclusion_reason')

