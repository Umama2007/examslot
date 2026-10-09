"""phase_b_schema

Revision ID: a1b2c3d4e5f6
Revises: 849ce0dbf8f9
Create Date: 2026-10-09 03:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '849ce0dbf8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. btree_gist extension (needed for EXCLUDE USING gist)
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Add is_cancelled to exam_slots
    op.add_column('exam_slots', sa.Column('is_cancelled', sa.Boolean(), nullable=False,
                                           server_default=sa.text('false')))

    # 3. exam_slots: end_ts GENERATED ALWAYS column
    #    = exam_date + COALESCE(end_time, start_time + interval '60 minutes')
    #    Stored as timestamp WITHOUT time zone (Asia/Karachi wall-clock)
    op.execute("""
        ALTER TABLE exam_slots
        ADD COLUMN end_ts timestamp without time zone
        GENERATED ALWAYS AS (
            (exam_date + COALESCE(end_time, start_time + interval '60 minutes'))::timestamp without time zone
        ) STORED;
    """)

    # 4. selections table
    op.create_table(
        'selections',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('course_id', sa.UUID(), nullable=False),
        sa.Column('slot_id', sa.UUID(), nullable=False),
        sa.Column('slot_range', postgresql.TSRANGE(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['slot_id'], ['exam_slots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'course_id', name='uq_selection_student_course'),
        sa.UniqueConstraint('student_id', 'slot_id', name='uq_selection_student_slot'),
    )

    # GiST exclusion constraint: same student, overlapping time ranges are blocked
    # Adjacent [) ranges are allowed (tsrange uses default lower-inclusive, upper-exclusive)
    op.execute("""
        ALTER TABLE selections
        ADD CONSTRAINT excl_student_slot_overlap
        EXCLUDE USING gist (
            student_id WITH =,
            slot_range WITH &&
        );
    """)

    # 5. change_requests table
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_request_type_enum') THEN
                CREATE TYPE change_request_type_enum AS ENUM ('change_branch', 'change_datesheet');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'change_request_status_enum') THEN
                CREATE TYPE change_request_status_enum AS ENUM ('pending', 'approved', 'rejected');
            END IF;
        END $$;
    """)

    op.create_table(
        'change_requests',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('request_type', sa.Enum('change_branch', 'change_datesheet',
                                           name='change_request_type_enum'), nullable=False),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected',
                                     name='change_request_status_enum'),
                  nullable=False, server_default='pending'),
        sa.Column('admin_remark', sa.String(), nullable=True),
        sa.Column('reviewed_by', sa.UUID(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Partial unique index: at most one pending request per (student, type)
    op.execute("""
        CREATE UNIQUE INDEX uq_pending_request_per_type
        ON change_requests (student_id, request_type)
        WHERE status = 'pending';
    """)

    # 6. unlocks table
    op.create_table(
        'unlocks',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('request_type', sa.Enum('change_branch', 'change_datesheet',
                                           name='change_request_type_enum'), nullable=False),
        sa.Column('change_request_id', sa.UUID(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['change_request_id'], ['change_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Partial unique index: at most one active (unused) unlock per (student, type)
    op.execute("""
        CREATE UNIQUE INDEX uq_active_unlock_per_type
        ON unlocks (student_id, request_type)
        WHERE used_at IS NULL;
    """)

    # 7. notifications table (for email retry/tracking)
    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('html_body', sa.Text(), nullable=False),
        sa.Column('text_body', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # 8. Add capacity column index on exam_slots for FOR UPDATE queries
    op.create_index('ix_exam_slots_course_id', 'exam_slots', ['course_id'])


def downgrade() -> None:
    op.drop_index('ix_exam_slots_course_id', table_name='exam_slots')
    op.drop_table('notifications')

    op.execute("DROP INDEX IF EXISTS uq_active_unlock_per_type;")
    op.drop_table('unlocks')

    op.execute("DROP INDEX IF EXISTS uq_pending_request_per_type;")
    op.drop_table('change_requests')

    op.execute("ALTER TABLE selections DROP CONSTRAINT IF EXISTS excl_student_slot_overlap;")
    op.drop_table('selections')

    op.execute("ALTER TABLE exam_slots DROP COLUMN IF EXISTS end_ts;")
    op.drop_column('exam_slots', 'is_cancelled')

    op.execute("DROP EXTENSION IF EXISTS btree_gist;")
