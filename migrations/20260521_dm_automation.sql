-- ===========================================================
-- DM 자동화 — Meta Instagram API 연동 (2026-05-21)
-- 댓글→DM 자동전환 (키워드 트리거)
-- ===========================================================
-- Supabase Studio → SQL Editor에서 실행

-- 1) meta_connections — 크리에이터별 Meta OAuth 연결 (creator당 1행)
CREATE TABLE IF NOT EXISTS meta_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  ig_user_id TEXT UNIQUE NOT NULL,
  ig_username TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT,
  long_lived_token_encrypted TEXT NOT NULL,
  page_access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  webhook_subscribed BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_connections_creator ON meta_connections(creator_id);
CREATE INDEX IF NOT EXISTS idx_meta_connections_ig_user ON meta_connections(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_meta_connections_expiry ON meta_connections(token_expires_at) WHERE active = true;

-- 2) dm_rules — 키워드 트리거 룰
CREATE TABLE IF NOT EXISTS dm_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  match_mode TEXT DEFAULT 'contains' CHECK (match_mode IN ('contains', 'exact', 'starts_with')),
  reply_message TEXT NOT NULL,
  post_id TEXT,
  per_user_cooldown_hours INTEGER DEFAULT 24,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_rules_creator_active ON dm_rules(creator_id, active);
CREATE INDEX IF NOT EXISTS idx_dm_rules_post ON dm_rules(post_id) WHERE post_id IS NOT NULL;

-- 3) dm_jobs — 발송 대기 큐 (Supabase 기반 간이 큐)
CREATE TABLE IF NOT EXISTS dm_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES dm_rules(id) ON DELETE SET NULL,
  comment_id TEXT NOT NULL,
  commenter_ig_user_id TEXT,
  commenter_username TEXT,
  comment_text TEXT,
  reply_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempt_count INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  enqueued_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dm_jobs_status_next ON dm_jobs(status, next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dm_jobs_creator_status ON dm_jobs(creator_id, status, enqueued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dm_jobs_comment ON dm_jobs(comment_id);

-- 4) dm_logs — 발송 결과 영구 로그
CREATE TABLE IF NOT EXISTS dm_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES dm_rules(id) ON DELETE SET NULL,
  job_id UUID REFERENCES dm_jobs(id) ON DELETE SET NULL,
  comment_id TEXT NOT NULL,
  message_id TEXT,
  recipient_ig_user_id TEXT,
  recipient_username TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'rate_limited', 'expired_window')),
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_logs_creator_time ON dm_logs(creator_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_logs_rule_time ON dm_logs(rule_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_logs_recipient ON dm_logs(creator_id, recipient_ig_user_id, sent_at DESC);

-- 5) RLS
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator manage own meta_connections" ON meta_connections FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);
CREATE POLICY "Creator manage own dm_rules" ON dm_rules FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);
CREATE POLICY "Creator read own dm_jobs" ON dm_jobs FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);
CREATE POLICY "Creator read own dm_logs" ON dm_logs FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);

-- 6) updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meta_connections_updated_at ON meta_connections;
CREATE TRIGGER trg_meta_connections_updated_at BEFORE UPDATE ON meta_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_dm_rules_updated_at ON dm_rules;
CREATE TRIGGER trg_dm_rules_updated_at BEFORE UPDATE ON dm_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
