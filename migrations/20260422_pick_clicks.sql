-- ===========================================================
-- pick_clicks 테이블 생성 (2026-04-22)
-- 공개 몰 유입·클릭 로그 — 통계 대시보드 1차 원본 데이터
-- ===========================================================
-- Supabase Studio → SQL Editor에서 실행 (혹은 psql)

CREATE TABLE IF NOT EXISTS pick_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_slug TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  pick_id UUID REFERENCES creator_picks(id) ON DELETE SET NULL,
  source_type TEXT,
  target_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  landing_url TEXT,
  user_agent TEXT,
  device TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pick_clicks_slug_time ON pick_clicks(shop_slug, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_clicks_creator_time ON pick_clicks(creator_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pick_clicks_pick ON pick_clicks(pick_id);
CREATE INDEX IF NOT EXISTS idx_pick_clicks_utm ON pick_clicks(shop_slug, utm_source, clicked_at DESC);

ALTER TABLE pick_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert pick_clicks" ON pick_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Creator read own clicks" ON pick_clicks FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE email = auth.email())
);
