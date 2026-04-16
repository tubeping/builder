-- TubePing 자체 상품 관리 테이블
-- Supabase Dashboard → SQL Editor에서 실행

-- 1. products 테이블 (자체 상품코드 기반)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tp_code TEXT NOT NULL UNIQUE,              -- TubePing 자체 코드 (TP-0001, TP-0002...)
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,          -- 판매가 (원)
  supply_price INTEGER NOT NULL DEFAULT 0,   -- 공급가 (원)
  retail_price INTEGER NOT NULL DEFAULT 0,   -- 소비자가 (원)
  image_url TEXT,                            -- 대표 이미지 URL
  selling TEXT NOT NULL DEFAULT 'T',         -- 판매 상태 (T=판매중, F=미판매)
  category TEXT,                             -- 카테고리
  description TEXT,                          -- 상품 설명
  memo TEXT,                                 -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. product_cafe24_mappings 테이블 (자체 상품 ↔ 카페24 몰 매핑)
CREATE TABLE IF NOT EXISTS product_cafe24_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cafe24_product_no INTEGER,                 -- 카페24 상품번호
  cafe24_product_code TEXT,                  -- 카페24 상품코드
  sync_status TEXT NOT NULL DEFAULT 'none',  -- none/pending/synced/error
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(product_id, store_id)               -- 같은 상품-스토어 조합은 1건만
);

-- 3. 자동 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_tp_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(tp_code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM products
  WHERE tp_code ~ '^TP-\d+$';

  new_code := 'TP-' || LPAD(next_num::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. 인덱스
CREATE INDEX IF NOT EXISTS idx_products_tp_code ON products(tp_code);
CREATE INDEX IF NOT EXISTS idx_products_selling ON products(selling);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_mappings_product_id ON product_cafe24_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_mappings_store_id ON product_cafe24_mappings(store_id);

-- 6. RLS 정책 (서비스 키 사용이므로 기본 비활성)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cafe24_mappings ENABLE ROW LEVEL SECURITY;

-- 서비스 키로 접근 허용
CREATE POLICY "Service role full access on products"
  ON products FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on mappings"
  ON product_cafe24_mappings FOR ALL
  USING (true) WITH CHECK (true);
