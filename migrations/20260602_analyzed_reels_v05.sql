-- ===========================================================
-- analyzed_reels v0.5: 분석 차원 4개 확장 (2026-06-02)
-- 영상의 공식·패턴·감정 흐름·컷 디테일 누적 → 다음 대본 생성에 활용
-- ===========================================================
-- Supabase Studio → SQL Editor 에서 실행

ALTER TABLE analyzed_reels
  ADD COLUMN IF NOT EXISTS emotion_flow JSONB,
  ADD COLUMN IF NOT EXISTS desire_triggers TEXT[],
  ADD COLUMN IF NOT EXISTS cut_details JSONB,
  ADD COLUMN IF NOT EXISTS extracted_pattern TEXT;

-- extracted_pattern 검색용 인덱스 (선택 — 풀이 커지면 도움)
CREATE INDEX IF NOT EXISTS idx_analyzed_reels_extracted_pattern
  ON analyzed_reels USING gin (to_tsvector('simple', coalesce(extracted_pattern, '')));

COMMENT ON COLUMN analyzed_reels.emotion_flow IS '시청자 감정 흐름 [{range, emotion, trigger}]';
COMMENT ON COLUMN analyzed_reels.desire_triggers IS '자극한 시청자 욕구·감정 1~5개';
COMMENT ON COLUMN analyzed_reels.cut_details IS '컷 전환·디테일 {total_cuts, avg_cut_sec, transition_styles, notable_cuts}';
COMMENT ON COLUMN analyzed_reels.extracted_pattern IS '이 영상의 공식 한 줄 — 다음 영상 만들 때 따라할 수 있는 형태';
