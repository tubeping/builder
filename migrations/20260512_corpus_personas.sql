-- ===========================================================
-- 학습 코퍼스 + 크리에이터 페르소나 (2026-05-12)
-- script_corpus: G-FRAME 태깅된 캡션·릴스 — 생성 시 RAG few-shot 소스
-- creator_personas: 1,038개 공구 계정 톤 카드 — 사용자 매칭용
-- ===========================================================
-- Supabase Studio → SQL Editor 에서 실행

-- ─── 1. script_corpus ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS script_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 출처
  source_type TEXT NOT NULL CHECK (source_type IN ('caption', 'reel_voice')),
  source_url TEXT,
  source_username TEXT,
  source_likes INTEGER DEFAULT 0,

  -- 카테고리 (MASTER xlsx 기준)
  group_name TEXT,             -- 식품_정육수산, 뷰티, 반려동물_전체 등
  subcategory TEXT,            -- 정육_한돈한우, 콜라겐_이너뷰티 등
  category_normalized TEXT,    -- '뷰티', '식품', '건강', '반려동물', '유아동', '주방생활'

  -- 원본
  raw_text TEXT NOT NULL,      -- 캡션 또는 STT 음성 대본 전체
  duration_sec INTEGER,        -- 음성 대본인 경우만

  -- G-FRAME 자동 태깅
  hook_type TEXT,              -- curiosity|storytelling|challenge|negative|comparison|visual_meme
  hook_text TEXT,
  hook_explanation TEXT,       -- 왜 이 후크가 효과적인지 한 줄
  frame_type TEXT,             -- PAS|BAB|FAB|PASTOR|QUEST|AIDA|4P
  cta_pattern TEXT,            -- urgency|scarcity|popularity|pressure|bonus
  cta_text TEXT,
  core_text TEXT,              -- 본론 요약

  -- 심리 태그 (다중)
  persuasion_tags TEXT[],

  -- 점수
  hook_score NUMERIC(3,1),     -- 0~10
  cta_strength NUMERIC(3,1),

  -- 갤러리 노출
  gallery_visible BOOLEAN DEFAULT false,
  thumbnail_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 — RAG 검색용
CREATE INDEX IF NOT EXISTS idx_corpus_category
  ON script_corpus(category_normalized, source_likes DESC);
CREATE INDEX IF NOT EXISTS idx_corpus_subcat
  ON script_corpus(subcategory, source_likes DESC);
CREATE INDEX IF NOT EXISTS idx_corpus_hook
  ON script_corpus(hook_type, hook_score DESC);
CREATE INDEX IF NOT EXISTS idx_corpus_gallery
  ON script_corpus(gallery_visible, category_normalized, source_likes DESC)
  WHERE gallery_visible = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_corpus_url
  ON script_corpus(source_url) WHERE source_url IS NOT NULL;

-- updated_at 트리거
CREATE OR REPLACE FUNCTION trg_corpus_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS script_corpus_updated_at ON script_corpus;
CREATE TRIGGER script_corpus_updated_at
  BEFORE UPDATE ON script_corpus
  FOR EACH ROW EXECUTE FUNCTION trg_corpus_updated_at();

-- RLS — 모든 인증 사용자 read-only (corpus는 공용 자산)
ALTER TABLE script_corpus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All read corpus" ON script_corpus;
CREATE POLICY "All read corpus" ON script_corpus FOR SELECT
  USING (auth.role() = 'authenticated');

-- 쓰기는 service_role만 (build 스크립트가 사용)
DROP POLICY IF EXISTS "Service write corpus" ON script_corpus;
CREATE POLICY "Service write corpus" ON script_corpus FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 2. creator_personas ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS creator_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 인스타 계정 정보
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  followers INTEGER,
  biography TEXT,

  -- 카테고리 (캡션·바이오 기반 자동 분류)
  primary_category TEXT,       -- '뷰티', '식품', '반려동물' 등
  sub_categories TEXT[],

  -- 톤 카드 (Claude로 추출)
  signature_phrases TEXT[],    -- ["오늘 진짜 미친 공구", "댕댕이맘님들"]
  sentence_endings TEXT[],     -- ["~거든요", "~잖아요"]
  preferred_hook_types TEXT[], -- 자주 쓰는 hook 유형 상위 2개
  preferred_frames TEXT[],     -- 자주 쓰는 프레임
  emoji_density NUMERIC(4,2),  -- 캡션당 평균 이모지 수
  avg_caption_length INTEGER,  -- 평균 글자수
  tone_summary TEXT,           -- "친근한 30대 워킹맘 톤" 한 줄
  vocabulary_level TEXT,       -- 'friendly' | 'pro' | 'hybrid'

  -- 샘플 (fewshot 주입용)
  sample_captions JSONB,       -- 대표 5개 캡션 [{text, likes}, ...]

  -- 학습 시점 메타
  caption_count INTEGER,       -- 학습에 쓴 캡션 수
  built_at TIMESTAMPTZ DEFAULT now(),
  rebuilt_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_persona_category
  ON creator_personas(primary_category, followers DESC);
CREATE INDEX IF NOT EXISTS idx_persona_followers
  ON creator_personas(followers DESC);

ALTER TABLE creator_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All read personas" ON creator_personas;
CREATE POLICY "All read personas" ON creator_personas FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service write personas" ON creator_personas;
CREATE POLICY "Service write personas" ON creator_personas FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 3. 사용자 ↔ 페르소나 매칭 (옵션, 가입 시) ─────────────────
-- creators 테이블에 인스타 username 필드가 이미 있다면 SKIP. 없으면 ALTER.
-- (idempotent하게 IF NOT EXISTS로 컬럼만 추가)
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS matched_persona_id UUID REFERENCES creator_personas(id);

CREATE INDEX IF NOT EXISTS idx_creators_ig_username
  ON creators(instagram_username) WHERE instagram_username IS NOT NULL;
