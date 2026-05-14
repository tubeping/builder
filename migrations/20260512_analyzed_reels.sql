-- ===========================================================
-- 릴스 분석 이력 테이블 (2026-05-12)
-- 사용자가 분석한 인스타 릴스를 영구 저장 → 스크립트 생성 시 few-shot 활용
-- ===========================================================
-- Supabase Studio → SQL Editor 에서 실행

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS analyzed_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  -- 원본 메타
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec INTEGER,
  source_username TEXT,            -- 원작 인스타 계정 (참고용)

  -- Whisper 전사 + 장면
  transcript JSONB,                -- [{ start, end, text }, ...]
  scenes JSONB,                    -- [{ time, desc }, ...]

  -- G-FRAME 자동 분류
  gframe JSONB,                    -- { hook, structure, cta }
  persuasion_tags TEXT[],          -- ['social_proof', 'scarcity', ...]
  category TEXT,                   -- '뷰티', '다이어트' 등
  recommended_for TEXT[],          -- 어울리는 제품군

  -- 점수
  hook_score NUMERIC(3,1),         -- 0.0 ~ 10.0
  cta_strength NUMERIC(3,1),

  -- 사용자 메모
  notes TEXT DEFAULT '',
  is_favorite BOOLEAN DEFAULT false,

  -- 상태
  status TEXT DEFAULT 'completed'
    CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_analyzed_reels_creator
  ON analyzed_reels(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_reels_category
  ON analyzed_reels(category) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_analyzed_reels_favorite
  ON analyzed_reels(creator_id, is_favorite) WHERE is_favorite = true;

-- 3. URL 중복 방지 (같은 사용자가 같은 릴스 재분석 시 UPDATE)
CREATE UNIQUE INDEX IF NOT EXISTS uq_analyzed_reels_creator_url
  ON analyzed_reels(creator_id, url);

-- 4. updated_at 자동 갱신
CREATE OR REPLACE FUNCTION trg_analyzed_reels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS analyzed_reels_updated_at ON analyzed_reels;
CREATE TRIGGER analyzed_reels_updated_at
  BEFORE UPDATE ON analyzed_reels
  FOR EACH ROW EXECUTE FUNCTION trg_analyzed_reels_updated_at();

-- 5. RLS — 본인 것만 CRUD
ALTER TABLE analyzed_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own analyzed reels select" ON analyzed_reels;
CREATE POLICY "Own analyzed reels select" ON analyzed_reels FOR SELECT
  USING (creator_id IN (SELECT id FROM creators WHERE email = auth.email()));

DROP POLICY IF EXISTS "Own analyzed reels insert" ON analyzed_reels;
CREATE POLICY "Own analyzed reels insert" ON analyzed_reels FOR INSERT
  WITH CHECK (creator_id IN (SELECT id FROM creators WHERE email = auth.email()));

DROP POLICY IF EXISTS "Own analyzed reels update" ON analyzed_reels;
CREATE POLICY "Own analyzed reels update" ON analyzed_reels FOR UPDATE
  USING (creator_id IN (SELECT id FROM creators WHERE email = auth.email()));

DROP POLICY IF EXISTS "Own analyzed reels delete" ON analyzed_reels;
CREATE POLICY "Own analyzed reels delete" ON analyzed_reels FOR DELETE
  USING (creator_id IN (SELECT id FROM creators WHERE email = auth.email()));

-- 6. admin 전체 조회 (super_admin만)
DROP POLICY IF EXISTS "Admins read all analyzed reels" ON analyzed_reels;
CREATE POLICY "Admins read all analyzed reels" ON analyzed_reels FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM creators WHERE email = auth.email()
            AND role IN ('admin', 'super_admin'))
  );
