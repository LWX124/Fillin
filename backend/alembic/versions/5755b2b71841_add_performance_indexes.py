"""add performance indexes

Revision ID: 5755b2b71841
Revises: 8d29fb34ee6c
Create Date: 2026-06-16 19:13:24.551168
"""
from typing import Sequence, Union
from alembic import op


revision: str = '5755b2b71841'
down_revision: Union[str, None] = '8d29fb34ee6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_bases_user_id ON knowledge_bases (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contents_kb_id ON contents (knowledge_base_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contents_created_at ON contents (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_crawler_tasks_user_id ON crawler_tasks (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_crawler_tasks_status ON crawler_tasks (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_credit_transactions_user_id ON credit_transactions (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_credit_transactions_created_at ON credit_transactions (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduled_crawls_user_id ON scheduled_crawls (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scheduled_crawls_next_run ON scheduled_crawls (next_run_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_tags_user_id ON tags (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_content_tags_content_id ON content_tags (content_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_content_tags_tag_id ON content_tags (tag_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_api_keys_user_id ON user_api_keys (user_id)")


def downgrade() -> None:
    op.drop_index('ix_knowledge_bases_user_id')
    op.drop_index('ix_contents_kb_id')
    op.drop_index('ix_contents_created_at')
    op.drop_index('ix_conversations_user_id')
    op.drop_index('ix_messages_conversation_id')
    op.drop_index('ix_crawler_tasks_user_id')
    op.drop_index('ix_crawler_tasks_status')
    op.drop_index('ix_credit_transactions_user_id')
    op.drop_index('ix_credit_transactions_created_at')
    op.drop_index('ix_scheduled_crawls_user_id')
    op.drop_index('ix_scheduled_crawls_next_run')
    op.drop_index('ix_tags_user_id')
    op.drop_index('ix_content_tags_content_id')
    op.drop_index('ix_content_tags_tag_id')
    op.drop_index('ix_user_api_keys_user_id')
