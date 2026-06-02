-- ===========================================================
-- DM 자동화 v2 보강 (2026-05-21)
-- 벤치마킹 결과 반영: event_id 중복방어, opt-out, human escalation
-- ===========================================================
-- Supabase Studio → SQL Editor에서 실행

-- 1) dm_jobs.event_id — webhook 중복 이벤트 방어
ALTER TABLE dm_jobs ADD COLUMN IF NOT EXISTS event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dm_jobs_event_id ON dm_jobs(event_id) WHERE event_id IS NOT NULL;

-- 2) dm_rules — opt-out 안내 (App Review 필수)
ALTER TABLE dm_rules ADD COLUMN IF NOT EXISTS opt_out_footer TEXT DEFAULT '※ 수신을 원치 않으시면 "그만"이라고 답장해주세요.';
ALTER TABLE dm_rules ADD COLUMN IF NOT EXISTS opt_out_keywords TEXT[] DEFAULT ARRAY['그만', '거부', 'stop', '수신거부'];

-- 3) dm_rules — Human Agent Escalation (App Review 필수)
ALTER TABLE dm_rules ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[] DEFAULT ARRAY['상담사', '사람', '담당자', 'human', 'agent'];
ALTER TABLE dm_rules ADD COLUMN IF NOT EXISTS escalation_message TEXT DEFAULT '잠시만 기다려주세요. 곧 담당자가 직접 답변드릴게요.';

-- 4) 트리거별 1 DM/user/24h 강제 — 이미 per_user_cooldown_hours로 처리됨 (default 24)
-- 단, 명확히 ALTER로 기본값 보강
ALTER TABLE dm_rules ALTER COLUMN per_user_cooldown_hours SET DEFAULT 24;

-- 5) meta_connections — opt-out 받은 사용자 목록 (트리거별 차단)
CREATE TABLE IF NOT EXISTS dm_opt_outs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  recipient_ig_user_id TEXT NOT NULL,
  recipient_username TEXT,
  opted_out_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dm_opt_outs ON dm_opt_outs(creator_id, recipient_ig_user_id);
CREATE INDEX IF NOT EXISTS idx_dm_opt_outs_recipient ON dm_opt_outs(recipient_ig_user_id);

ALTER TABLE dm_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator read own opt_outs" ON dm_opt_outs FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);

-- 6) Human Escalation 인박스 — 자동화 중단 후 사람이 응답 대기
CREATE TABLE IF NOT EXISTS dm_escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE NOT NULL,
  ig_user_id TEXT NOT NULL,
  trigger_message TEXT,
  recipient_ig_user_id TEXT,
  recipient_username TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolved_by TEXT,
  notes TEXT,
  escalated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dm_escalations_creator_status ON dm_escalations(creator_id, status, escalated_at DESC);

ALTER TABLE dm_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator manage own escalations" ON dm_escalations FOR ALL USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);

-- 7) 토큰 갱신 메타데이터
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ;
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS refresh_failure_count INTEGER DEFAULT 0;
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS last_refresh_error TEXT;
