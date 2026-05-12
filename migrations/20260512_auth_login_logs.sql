-- ===========================================================
-- 로그인 활동 로그 (2026-05-12)
-- 보안: 어디서·언제·어떤 방식으로 로그인했는지 추적
-- ===========================================================

CREATE TABLE IF NOT EXISTS auth_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,                    -- auth.users.id
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- 'login_success' | 'login_failed' | 'logout' | 'password_reset' | 'signup'
  method TEXT,                     -- 'google' | 'email' | 'recovery'
  ip_hash TEXT,                    -- 해시 (개인정보 최소화)
  user_agent TEXT,
  device TEXT,                     -- 'mobile' | 'desktop' | 'tablet'
  country TEXT,                    -- (선택) IP geolocation 결과
  error_message TEXT,              -- 실패 시
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_email_time ON auth_login_logs(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_time ON auth_login_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event ON auth_login_logs(event_type, created_at DESC);

ALTER TABLE auth_login_logs ENABLE ROW LEVEL SECURITY;

-- 본인만 자기 로그 SELECT
DROP POLICY IF EXISTS "User read own auth logs" ON auth_login_logs;
CREATE POLICY "User read own auth logs" ON auth_login_logs FOR SELECT
  USING (
    email = auth.email()
    OR EXISTS (SELECT 1 FROM creators WHERE email = auth.email() AND role IN ('admin', 'super_admin'))
  );

-- 누구나 본인 이벤트 INSERT (가입/로그인 시점은 미인증 가능성)
DROP POLICY IF EXISTS "Public insert auth logs" ON auth_login_logs;
CREATE POLICY "Public insert auth logs" ON auth_login_logs FOR INSERT
  WITH CHECK (true);

-- 자동 정리 — 6개월 이상 된 로그 삭제 (선택, cron 또는 수동 실행)
-- DELETE FROM auth_login_logs WHERE created_at < now() - INTERVAL '6 months';
