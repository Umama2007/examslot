import os
from sqlalchemy import create_engine, text
engine = create_engine(os.environ.get('TEST_DATABASE_URL', 'postgresql+psycopg://postgres.azowumjysarpkszbtzyl:UmamaHamza%402007@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require'))
with engine.connect() as conn:
    for r in conn.execute(text("SELECT pid, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state != 'idle'")):
        print(r)
