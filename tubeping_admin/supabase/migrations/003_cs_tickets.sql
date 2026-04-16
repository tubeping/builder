-- TubePing CS 통합 관리 테이블
-- 카페24 문의 + 문자/전화 + 카카오톡/네이버톡 통합
-- 선행: 001_products.sql (stores 테이블 필요)

-- ============================================================
-- 1. cs_tickets (CS 티켓 — 모든 채널 통합)
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id),                     -- 어느 스토어 문의인지 (nullable: 채널 무관 문의)

  -- 채널 정보
  channel TEXT NOT NULL DEFAULT 'cafe24',                   -- cafe24 / sms / phone / kakao / naver_talk
  channel_ticket_id TEXT,                                   -- 채널별 원본 ID (카페24 article_no 등)
  channel_board_no INTEGER,                                 -- 카페24 게시판 번호

  -- 문의 유형
  ticket_type TEXT NOT NULL DEFAULT 'inquiry',              -- inquiry(문의) / complaint(불만) / return(반품) / exchange(교환) / cancel(취소) / etc
  category TEXT,                                            -- 상품문의 / 배송문의 / 기타 등

  -- 문의자 정보
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_id TEXT,                                         -- 카페24 회원 ID 등

  -- 관련 주문/상품
  order_id TEXT,                                            -- 카페24 주문번호
  product_name TEXT,

  -- 문의 내용
  subject TEXT NOT NULL,                                    -- 제목
  content TEXT,                                             -- 본문
  attachments JSONB DEFAULT '[]',                           -- 첨부파일 URLs

  -- 답변
  reply TEXT,                                               -- 답변 내용
  replied_at TIMESTAMPTZ,                                   -- 답변 일시
  replied_by TEXT,                                          -- 답변자

  -- 상태
  status TEXT NOT NULL DEFAULT 'open',                      -- open / in_progress / replied / closed
  priority TEXT NOT NULL DEFAULT 'normal',                  -- low / normal / high / urgent
  assigned_to TEXT,                                         -- 담당자

  -- 메타
  memo TEXT,
  tags JSONB DEFAULT '[]',
  raw_data JSONB,                                           -- 원본 API 응답 보관

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 채널+원본ID로 중복 수집 방지
  UNIQUE(channel, channel_ticket_id, store_id)
);

-- ============================================================
-- 2. cs_ticket_messages (티켓 대화 이력 — 멀티턴)
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES cs_tickets(id) ON DELETE CASCADE,

  direction TEXT NOT NULL DEFAULT 'inbound',                -- inbound(고객→우리) / outbound(우리→고객)
  sender_name TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',

  channel TEXT,                                             -- 어느 채널로 주고받았는지
  channel_message_id TEXT,                                  -- 채널별 메시지 ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 트리거 — updated_at 자동 갱신
-- ============================================================
CREATE TRIGGER cs_tickets_updated_at
  BEFORE UPDATE ON cs_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cs_tickets_store_id ON cs_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_channel ON cs_tickets(channel);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_status ON cs_tickets(status);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_priority ON cs_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_ticket_type ON cs_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_customer_phone ON cs_tickets(customer_phone);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_created_at ON cs_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_cs_ticket_messages_ticket_id ON cs_ticket_messages(ticket_id);

-- ============================================================
-- 5. RLS 정책
-- ============================================================
ALTER TABLE cs_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cs_tickets"
  ON cs_tickets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on cs_ticket_messages"
  ON cs_ticket_messages FOR ALL USING (true) WITH CHECK (true);
