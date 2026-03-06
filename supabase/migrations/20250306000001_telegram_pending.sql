-- Table for storing pending uploads from Telegram before project selection
CREATE TABLE IF NOT EXISTS telegram_pending_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT NOT NULL,
  file_id TEXT NOT NULL,
  file_unique_id TEXT,
  caption TEXT,
  media_group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_pending_chat ON telegram_pending_uploads(telegram_chat_id);

-- RLS (only service role needs access really, but good practice)
ALTER TABLE telegram_pending_uploads ENABLE ROW LEVEL SECURITY;
