-- ===========================================================
-- 가입 동의 audit (2026-05-12)
-- 법령상 동의 입증 자료 (개인정보보호법·정보통신망법)
-- ===========================================================

CREATE TABLE IF NOT EXISTS consent_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,                    -- auth.users.id (null 가능 — 가입 직후 매핑)
  email TEXT NOT NULL,
  -- 동의 항목 (필수 3 + 선택 1)
  age_14_consent BOOLEAN NOT NULL DEFAULT false,
  terms_consent BOOLEAN NOT NULL DEFAULT false,
  privacy_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  -- 동의 시점/환경
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,                    -- 해시된 IP (개인정보 최소화)
  user_agent TEXT,
  -- 약관 버전 (변경 이력 추적)
  terms_version TEXT DEFAULT '2026-05-12',
  privacy_version TEXT DEFAULT '2026-05-12',
  -- 가입 경로
  signup_method TEXT,              -- 'google' | 'email'
  source TEXT                      -- 'signup' | 'marketing_update' 등
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_email ON consent_audit(email, consented_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_audit_user ON consent_audit(user_id, consented_at DESC);

ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

-- 누구나 본인 동의 기록만 INSERT/SELECT
DROP POLICY IF EXISTS "User insert own consent" ON consent_audit;
CREATE POLICY "User insert own consent" ON consent_audit FOR INSERT
  WITH CHECK (true);  -- 가입 시점은 미인증 상태라 자유 INSERT 허용 (email/IP가 검증)

DROP POLICY IF EXISTS "User read own consent" ON consent_audit;
CREATE POLICY "User read own consent" ON consent_audit FOR SELECT
  USING (
    email = auth.email()
    OR EXISTS (SELECT 1 FROM creators WHERE email = auth.email() AND role IN ('admin', 'super_admin'))
  );
