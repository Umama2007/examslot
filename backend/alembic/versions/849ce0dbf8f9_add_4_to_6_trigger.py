"""add_4_to_6_trigger

Revision ID: 849ce0dbf8f9
Revises: 90f2361eb221
Create Date: 2026-10-09 00:40:43.628282

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '849ce0dbf8f9'
down_revision: Union[str, Sequence[str], None] = '90f2361eb221'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
    CREATE OR REPLACE FUNCTION enforce_4_to_6_rule()
    RETURNS TRIGGER AS $$
    DECLARE
        course_count INT;
        v_student_id UUID;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_student_id := OLD.student_id;
        ELSE
            v_student_id := NEW.student_id;
        END IF;

        SELECT COUNT(*) INTO course_count FROM student_courses WHERE student_id = v_student_id;
        
        IF course_count > 0 AND (course_count < 4 OR course_count > 6) THEN
            RAISE EXCEPTION 'A student must have between 4 and 6 courses.';
        END IF;
        
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    """)

    op.execute("""
    CREATE CONSTRAINT TRIGGER check_4_to_6_courses
    AFTER INSERT OR UPDATE OR DELETE ON student_courses
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_4_to_6_rule();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS check_4_to_6_courses ON student_courses;")
    op.execute("DROP FUNCTION IF EXISTS enforce_4_to_6_rule();")
