-- TubePing 상품 옵션/재고 테이블
-- Supabase Dashboard → SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_code TEXT,                           -- 자체 배리언트 코드
  option_name TEXT,                            -- 옵션명 (예: 색상)
  option_value TEXT,                           -- 옵션값 (예: 블랙)
  price INTEGER NOT NULL DEFAULT 0,            -- 배리언트별 판매가 (0이면 상품 기본가 사용)
  quantity INTEGER NOT NULL DEFAULT 0,         -- 재고 수량
  display TEXT NOT NULL DEFAULT 'T',           -- 진열 여부 (T/F)
  selling TEXT NOT NULL DEFAULT 'T',           -- 판매 여부 (T/F)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상품 테이블에 총 재고 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_stock INTEGER NOT NULL DEFAULT 0;
-- 상품 테이블에 공급사 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier TEXT;

-- updated_at 자동 갱신 트리거
CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_selling ON product_variants(selling);

-- RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on variants"
  ON product_variants FOR ALL
  USING (true) WITH CHECK (true);
