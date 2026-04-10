-- ─────────────────────────────────────────────
-- 006_okrs.sql — OKR 관리 (분기 목표/핵심결과)
-- ─────────────────────────────────────────────

-- Objectives (분기 목표)
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter TEXT NOT NULL,                  -- "2026-Q2"
  title TEXT NOT NULL,                    -- "어드민 운영 안정화"
  description TEXT,                       -- "Why" 설명
  category TEXT,                          -- "운영" / "성장" / "수익화" / "투자"
  priority INTEGER DEFAULT 3,             -- 1(최우선) ~ 5
  owner TEXT,                             -- 담당자
  emoji TEXT DEFAULT '🎯',
  status TEXT DEFAULT 'active',           -- active / archived
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objectives_quarter ON objectives(quarter);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

-- Key Results (핵심 결과 지표)
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                    -- "발행 리뷰 수"
  metric_type TEXT DEFAULT 'number',      -- number / percent / currency / boolean
  unit TEXT,                              -- "건", "%", "원" 등
  start_value NUMERIC DEFAULT 0,          -- 시작값
  current_value NUMERIC DEFAULT 0,        -- 현재값
  target_value NUMERIC NOT NULL,          -- 목표값
  note TEXT,                              -- 측정 방법/메모
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_results_objective ON key_results(objective_id);

-- Progress Log (진행률 체크인 기록)
CREATE TABLE IF NOT EXISTS okr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_kr ON okr_checkins(key_result_id);

-- RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access objectives" ON objectives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access key_results" ON key_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access okr_checkins" ON okr_checkins FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2026 Q2 OKR 시드 데이터
-- ─────────────────────────────────────────────
INSERT INTO objectives (quarter, title, description, category, priority, emoji, sort_order) VALUES
('2026-Q2', '어드민 운영 안정화', '정산/주문/발주가 매일 운영 도구. 버그 하나가 매출 누락으로 직결.', '운영', 1, '⚙️', 1),
('2026-Q2', '리뷰양이 — 검색 트래픽 받는 리뷰 사이트', '롱테일 SEO + 쿠팡 어필리에이트 수익화. 콘텐츠 자동 생성 인프라 검증.', '수익화', 1, '🦉', 2),
('2026-Q2', '튜핑 빌더 — 유튜버 30분 온보딩', '핵심 수익 모델. 인플루언서 진입장벽 제거.', '성장', 2, '🛠️', 3),
('2026-Q2', '콘텐츠 머신 — 사람 손 없이 일 1건 발행', '시간 레버리지. 자동 파이프라인 검증.', '운영', 3, '🤖', 4),
('2026-Q2', '영업 — 유튜버 입점 파이프라인', '빌더가 비어있으면 의미 없음. 입점 채널 발굴.', '성장', 2, '📧', 5),
('2026-Q2', '투자유치 — 1억원 확보', '4월 발표평가 임박. 실제 지원금 확보.', '투자', 1, '💰', 6),
('2026-Q2', '소싱 파이프라인 — 주 1회 자동 리포트', '이미 운영 중. 수동성 제거.', '운영', 4, '📊', 7);

-- O1: 어드민 운영 안정화 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, 'P0/P1 버그 잔여 수', 'number', '건', 25, 25, 0, 1 FROM objectives WHERE title='어드민 운영 안정화';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '모바일 반응형 적용 페이지', 'percent', '%', 40, 60, 100, 2 FROM objectives WHERE title='어드민 운영 안정화';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '정산 모듈 월 보정 건수', 'number', '건', 5, 5, 0, 3 FROM objectives WHERE title='어드민 운영 안정화';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '카페24 토큰 자동 갱신 실패율', 'percent', '%', 5, 5, 1, 4 FROM objectives WHERE title='어드민 운영 안정화';

-- O2: 리뷰양이 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '발행 리뷰 수 (published)', 'number', '건', 5, 5, 100, 1 FROM objectives WHERE title='리뷰양이 — 검색 트래픽 받는 리뷰 사이트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, 'reviewyangi.com 정식 런칭', 'boolean', '', 0, 0, 1, 2 FROM objectives WHERE title='리뷰양이 — 검색 트래픽 받는 리뷰 사이트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, 'Google Search Console 월간 노출', 'number', '회', 0, 0, 5000, 3 FROM objectives WHERE title='리뷰양이 — 검색 트래픽 받는 리뷰 사이트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '월간 자연 유입 세션', 'number', '세션', 0, 0, 1000, 4 FROM objectives WHERE title='리뷰양이 — 검색 트래픽 받는 리뷰 사이트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '쿠팡 파트너스 월 수익', 'currency', '원', 0, 0, 100000, 5 FROM objectives WHERE title='리뷰양이 — 검색 트래픽 받는 리뷰 사이트';

-- O3: 튜핑 빌더 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '온보딩 5단계 완주율', 'percent', '%', 0, 0, 70, 1 FROM objectives WHERE title='튜핑 빌더 — 유튜버 30분 온보딩';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '카페24 마진율 UI 노출', 'boolean', '', 0, 0, 1, 2 FROM objectives WHERE title='튜핑 빌더 — 유튜버 30분 온보딩';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '인플루언서 분석 대시보드 MVP', 'boolean', '', 0, 0, 1, 3 FROM objectives WHERE title='튜핑 빌더 — 유튜버 30분 온보딩';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '베타 입점 유튜버', 'number', '명', 0, 0, 5, 4 FROM objectives WHERE title='튜핑 빌더 — 유튜버 30분 온보딩';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '베타 사용자 첫 매출 발생', 'number', '명', 0, 0, 3, 5 FROM objectives WHERE title='튜핑 빌더 — 유튜버 30분 온보딩';

-- O4: 콘텐츠 머신 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '매일 자동 발행 블로그', 'boolean', '', 0, 0, 1, 1 FROM objectives WHERE title='콘텐츠 머신 — 사람 손 없이 일 1건 발행';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '3채널 발행 성공률', 'percent', '%', 0, 0, 95, 2 FROM objectives WHERE title='콘텐츠 머신 — 사람 손 없이 일 1건 발행';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, 'SEO 점수 80+ 통과율', 'percent', '%', 0, 0, 90, 3 FROM objectives WHERE title='콘텐츠 머신 — 사람 손 없이 일 1건 발행';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '카드뉴스 주 발행', 'number', '건', 0, 0, 3, 4 FROM objectives WHERE title='콘텐츠 머신 — 사람 손 없이 일 1건 발행';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '콘텐츠 머신 월간 자연 유입', 'number', '세션', 0, 0, 500, 5 FROM objectives WHERE title='콘텐츠 머신 — 사람 손 없이 일 1건 발행';

-- O5: 영업 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '수집 채널 수', 'number', '개', 0, 0, 3000, 1 FROM objectives WHERE title='영업 — 유튜버 입점 파이프라인';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '누적 이메일 발송', 'number', '건', 0, 0, 1000, 2 FROM objectives WHERE title='영업 — 유튜버 입점 파이프라인';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '응답률', 'percent', '%', 0, 0, 3, 3 FROM objectives WHERE title='영업 — 유튜버 입점 파이프라인';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '입점 상담 진행', 'number', '건', 0, 0, 20, 4 FROM objectives WHERE title='영업 — 유튜버 입점 파이프라인';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '실제 입점 계약', 'number', '건', 0, 0, 5, 5 FROM objectives WHERE title='영업 — 유튜버 입점 파이프라인';

-- O6: 투자유치 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '창업중심대학 발표평가 통과', 'boolean', '', 0, 0, 1, 1 FROM objectives WHERE title='투자유치 — 1억원 확보';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '발표 자료 완성 + 리허설 3회', 'number', '회', 0, 0, 3, 2 FROM objectives WHERE title='투자유치 — 1억원 확보';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '1억원 사업비 집행 계획서 승인', 'boolean', '', 0, 0, 1, 3 FROM objectives WHERE title='투자유치 — 1억원 확보';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '추가 투자유치 미팅', 'number', '회', 0, 0, 5, 4 FROM objectives WHERE title='투자유치 — 1억원 확보';

-- O7: 소싱 파이프라인 KR
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '주간 소싱 리포트 자동 발행', 'boolean', '', 0, 0, 1, 1 FROM objectives WHERE title='소싱 파이프라인 — 주 1회 자동 리포트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '추천→입점 전환율 추적 시스템', 'boolean', '', 0, 0, 1, 2 FROM objectives WHERE title='소싱 파이프라인 — 주 1회 자동 리포트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '소싱 채널 수', 'number', '개', 5, 5, 15, 3 FROM objectives WHERE title='소싱 파이프라인 — 주 1회 자동 리포트';
INSERT INTO key_results (objective_id, title, metric_type, unit, start_value, current_value, target_value, sort_order)
SELECT id, '데이터 소스 추가', 'number', '개', 2, 2, 4, 4 FROM objectives WHERE title='소싱 파이프라인 — 주 1회 자동 리포트';
