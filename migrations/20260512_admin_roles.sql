-- ===========================================================
-- admin 권한 시스템 (2026-05-12)
-- creators.role 컬럼 추가 + RLS 정책 + super_admin 지정
-- ===========================================================
-- Supabase Studio → SQL Editor 에서 실행

-- 1. role 컬럼 추가
ALTER TABLE creators ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'creator'
  CHECK (role IN ('creator', 'admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_creators_role ON creators(role)
  WHERE role != 'creator';

-- 2. super_admin 지정 (master + chlwns33)
UPDATE creators SET role = 'super_admin'
WHERE email IN ('master@shinsananalytics.com', 'chlwns33@gmail.com');

-- 3. admin이 모든 크리에이터 데이터 조회 가능 (RLS)
DROP POLICY IF EXISTS "Admins read all creators" ON creators;
CREATE POLICY "Admins read all creators" ON creators FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM creators WHERE email = auth.email() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins read all picks" ON creator_picks;
CREATE POLICY "Admins read all picks" ON creator_picks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM creators WHERE email = auth.email() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins read all clicks" ON pick_clicks;
CREATE POLICY "Admins read all clicks" ON pick_clicks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM creators WHERE email = auth.email() AND role IN ('admin', 'super_admin'))
  );

-- 4. 확인
SELECT email, name, shop_slug, role FROM creators ORDER BY
  CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
  created_at DESC;
