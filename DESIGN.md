# TubePing Builder — 플랫폼 설계 v3.0

**업데이트**: 2026-04-15
**기반**: 인플루언서 인터뷰 (2026-04-15, 51분) + 경쟁사 분석 (Ureca·WKWK) + v2.0
**철학**: Zero-touch · 큐레이터 정체성 유지 · 앱 없음 · 내러티브 우선

---

## 🎯 플랫폼 포지셔닝

### v2.0 → v3.0 변경점
```
v2.0: Zero-touch 공구 플랫폼 + 크리에이터 공개몰 + 멀티소스 큐레이션
v3.0: Zero-touch 커머스 플랫폼 + 블록 기반 크리에이터 페이지 + 멀티소스 PICK + AI 보조
```

### 경쟁 구도
```
Ureca     = AI 대본 생성 도구 (콘텐츠 제작)
WKWK      = AI 숏폼 편집 도구 (영상 제작)
인포크    = 링크인바이오 (링크 모음)
마플샵    = 크리에이터 독립몰 (상품 판매)
─────────────────────────────────────
TubePing  = 커머스 운영 플랫폼 (소싱→판매→정산 풀체인)
```

**핵심 차별점**: 다른 서비스는 콘텐츠 or 링크만 다룸. TubePing은 **소싱·판매·정산까지 풀체인**을 Zero-touch로 제공.

---

## 🧩 아키텍처 4계층

```
┌────────────────────────────────────────────┐
│  D. tubeping_builder (크리에이터 UI)       │
│     · 블록 에디터 공개몰 (커스텀 도메인)    │
│     · 대시보드 (공구·PICK·수익·추천)        │
├────────────────────────────────────────────┤
│  C. tubeping_admin (운영 백오피스)         │
│     · CRM · 매칭·캠페인 · 주문·CS · 정산    │
├────────────────────────────────────────────┤
│  B. tubeping-sourcing (Python 엔진)        │
│     · scorer · persona · matcher · quality │
├────────────────────────────────────────────┤
│  A. Supabase (공유 DB)                     │
└────────────────────────────────────────────┘
```

---

## 📱 크리에이터 대시보드

### 메뉴 구성 (10개)

| 메뉴 | 컴포넌트 | 상태 | 핵심 변경 (v3.0) |
|---|---|---|---|
| 🔔 공구 제안함 | CampaignInbox | UI 완료 | 제안→수락→콘텐츠→승인→라이브 플로우 추가 |
| 🎯 상품 추천 | ProductRecommend | UI 완료 | 실데이터 연동 (YouTube·쿠팡·판매DB) |
| 📦 내 PICK | MyPicks | UI 완료 | **멀티소스 등록 UI 추가** (5개 소스) |
| 🔗 파트너스 | Partners | UI 완료 | - |
| 🎨 몰 꾸미기 | ShopCustomize | UI 완료 | **블록 에디터로 전환** |
| 📊 콘텐츠 분석 | ContentAnalytics | UI 완료 | - |
| 💬 자동응답 | AutoDM | UI 완료 | - |
| 💰 수익 | Earnings | UI 완료 | 멀티소스 통합 정산 |
| 👥 팬 인사이트 | FanInsights | UI 완료 | - |
| ⚙️ 설정 | Settings | UI 완료 | 커스텀 도메인 설정 |

---

## 🛍️ 공개몰 — 블록 에디터 (v3.0 신규)

### 인터뷰 근거
> "1인 큐레이터는 내러티브를 말할 수 있는 장치가 필요해" (참석자4, 14:10)
> "뭐 파는 애네 — 이거가 먼저 나오면 안 된다" (참석자4, 14:48)
> "사람마다 다 할 수 있게끔 기능을 주면 되죠" (참석자1, 17:09)

### 블록 타입 (12종)

| 블록 | 설명 | 필수 |
|------|------|------|
| `hero` | 커버 이미지 + 프로필 + 소개 + SNS | 필수 (최상단) |
| `text` | 자유 텍스트 (마크다운/서식) | - |
| `image` | 단일 이미지 + 캡션 | - |
| `gallery` | 이미지 갤러리 (2~4열 그리드) | - |
| `banner` | 공구 배너 (D-day + CTA) | - |
| `links` | SNS/외부 링크 버튼 | - |
| `picks` | 내 PICK 상품 그리드 | - |
| `video` | 유튜브 임베드 | - |
| `divider` | 구분선 | - |
| `reviews` | 리뷰 섹션 | - |
| `newsletter` | 이메일 구독 폼 | - |
| `html` | 커스텀 HTML (고급) | - |

### DB 저장
```sql
-- creator_shops.blocks 컬럼 추가
ALTER TABLE creator_shops ADD COLUMN blocks JSONB DEFAULT '[]';

-- blocks 예시
[
  { "type": "hero", "data": { "cover_url": "...", "name": "귀빈정", "bio": "건강을 큐레이션합니다" } },
  { "type": "text", "data": { "content": "저는 10년간 건강 콘텐츠를..." } },
  { "type": "video", "data": { "youtube_url": "https://youtu.be/..." } },
  { "type": "banner", "data": { "campaign_id": "...", "dday": 3 } },
  { "type": "picks", "data": { "filter": "all", "limit": 12 } },
  { "type": "links", "data": { "items": [...] } },
  { "type": "reviews", "data": { "limit": 10 } }
]
```

### 대시보드 UX
- 드래그&드롭으로 블록 순서 변경
- 블록 클릭 → 오른쪽 편집 패널
- 실시간 모바일 프리뷰 (기존 ShopCustomize 패턴 유지)
- 블록 추가: `+` 버튼 → 블록 타입 선택

### 예시 레이아웃 — 건강 큐레이터
```
[hero]     프로필 + "건강을 큐레이션합니다"
[text]     내러티브 (나는 누구인지)
[video]    대표 유튜브 영상
[banner]   이번 주 공구: 혈당측정기 D-3
[picks]    내 PICK 컬렉션
[links]    유튜브 | 인스타 | 문의
[reviews]  구매 리뷰
```

---

## 📦 상품 등록 — 멀티소스 통합 (v3.0 확장)

### 5개 소스별 등록 방식

| 소스 | 등록 방식 | 구매 동선 | 수익 모델 |
|------|---------|---------|---------|
| **🔥 공구** (TubePing) | 캠페인 승인 시 자동 추가 | 자체 상세→카페24 결제 | 공급사 수수료 10~15% |
| **🟠 쿠팡파트너스** | URL 붙여넣기→자동 파싱 | 쿠팡 앱/웹 리다이렉트 | 쿠팡 커미션 3% |
| **🟢 네이버 파트너스** | URL 붙여넣기→자동 파싱 | 네이버 스마트스토어 | 네이버 커미션 |
| **📦 직접 상품** | 수동 입력 (이름/가격/이미지/URL) | 입력한 URL로 이동 | 100% 크리에이터 |
| **🔗 기타 제휴** | URL + 수수료율 입력 | 해당 사이트 이동 | 제휴 커미션 |

### 쿠팡파트너스 자동 파싱 흐름
```
크리에이터: 쿠팡 URL 붙여넣기
  → API: 상품ID 추출 → 쿠팡 파트너스 API 조회
  → 자동 채움: 상품명, 가격, 이미지, 카테고리
  → 크리에이터: 큐레이션 코멘트 작성 → 저장
```

### CPS 장기판매 (인터뷰 핵심 니즈)
> "공동구매 끝나버려. 6개월 지나도 문의 온다" (참석자4, 43:55)

```
공구 종료 → 자동 "아카이브" 전환
  - 공구가격 만료, 일반가로 계속 노출
  - [공구종료] 뱃지 + "일반가 구매" 버튼
  - 6개월 후에도 검색·구매 가능
```

### DB 스키마 변경
```sql
-- creator_picks 확장
ALTER TABLE creator_picks ADD COLUMN source_meta JSONB DEFAULT '{}';
-- source_meta 예시:
-- 쿠팡: {"partner_id": "...", "product_no": "...", "commission_rate": 3}
-- 네이버: {"channel_id": "...", "product_no": "..."}
-- 직접: {"custom_price": 29900, "custom_image": "..."}

-- campaigns 상태 추가
-- status에 'archived' 추가 (공구 종료 후 장기판매 상태)
```

---

## 🌐 커스텀 도메인 (v3.0 신규)

### 인터뷰 근거
> 링크인포크 도메인 "한 달에 10만원짜리 긁어서 3달째 쓰고 있다" (참석자4, 19:37)
> "본인 도메인으로" — "그렇죠" (19:15~19:17)

### 도메인 옵션 (전부 무료)

| 옵션 | 예시 | 설정 |
|------|------|------|
| 기본 | `tubeping.shop/gwibinjeong` | 자동 |
| 숏링크 | `tpng.kr/gwibinjeong` | 자동 |
| 커스텀 | `shop.bluesync.kr` | CNAME 설정 안내 |

### 기술 구현
```
1. 크리에이터: 설정 > 도메인 > "shop.bluesync.kr" 입력
2. 안내: "DNS에 CNAME 레코드 추가해주세요"
   CNAME: shop.bluesync.kr → cname.vercel-dns.com
3. Vercel API: POST /v10/projects/{id}/domains { "name": "shop.bluesync.kr" }
4. middleware.ts: 커스텀 도메인 → slug 매핑 → /shop/[slug] rewrite
5. SSL 자동 발급 (Let's Encrypt)
```

### middleware.ts 로직
```typescript
const hostname = request.headers.get('host');
const defaultDomains = ['localhost', 'tubeping.com', 'tubeping.shop'];

if (!defaultDomains.some(d => hostname?.includes(d))) {
  // 커스텀 도메인 → DB에서 slug 조회 → rewrite
  const slug = await getSlugByDomain(hostname);
  if (slug) return NextResponse.rewrite(new URL(`/shop/${slug}`, request.url));
}
```

---

## 🎯 상품 추천 — 실데이터 기반 (v3.0 확장)

### 데이터 소스 3층

```
[1층] 크리에이터 데이터
  · YouTube Data API (공개: 구독자, 인기영상, 댓글)
  · YouTube Studio CSV 업로드 (비공개: 연령, 성별, 시청시간)
  · 인스타 스크린샷 OCR (기존 parse-insight API)
  · 쿠팡 파트너스 API (클릭, 전환, 매출)
       ↓
[2층] 외부 트렌드 데이터
  · 네이버 데이터랩 (검색량, 연령별)
  · 아이보스 (마케팅 트렌드)
  · TubePing 판매 DB (전체 크리에이터 매출 데이터)
       ↓
[3층] AI 스코어링
  · 콘텐츠 매칭 25% + 구매의향 20% + 검색수요 20% + 트렌드 15% + 연령매칭 20%
  · 카테고리별 TOP 10 추천 → "내 PICK 추가" 원클릭
```

### 판매 실적 반영 (핵심 차별점)
```sql
SELECT p.category, p.name,
       COUNT(o.id) as order_count,
       SUM(o.amount) as total_revenue,
       AVG(r.product_rating) as avg_rating
FROM orders o
JOIN campaigns c ON o.campaign_id = c.id
JOIN products p ON c.product_id = p.id
LEFT JOIN reviews r ON r.product_id = p.id
WHERE c.creator_id = {creator_id}
GROUP BY p.category, p.name
ORDER BY total_revenue DESC;
-- → "이 크리에이터는 건강식품이 잘 팔림" → 건강식품 가중치 UP
```

### 품질 검증 스코어 (인터뷰 니즈)
> "제품 퀄리티 자체에 대한 검증이 안 되니까 선정을 못하겠더라" (참석자4, 26:25)

```
품질 스코어 = 네이버 리뷰 점수(40%) + 업체 업력(20%) + 법인 정보(20%) + 인증(20%)
  → S/A/B/C/D 등급 표시
  → B 이상만 추천 목록에 노출
```

---

## 💬 AI 보조 기능 (v3.0 신규, Ureca 참고)

### 인터뷰 근거
> 상품 선택 → AI 스크립트 → "유리카 AI" (참석자1, 29:10)
> "웬만한 유튜버들은 자기만의 코드가 이미 다 있잖아요" (참석자4, 31:01)

### 원칙: 보조 도구, 핵심 아님
- Ureca처럼 AI 과금 모델 ❌ (참석자4가 해지한 이유)
- 상품 선택 시 "AI 스크립트 참고" 버튼 하나만 제공
- Claude API 연동, 채널 페르소나 반영

### 기능
1. **상품 → 스크립트 생성**: PICK에서 상품 선택 → "이 상품 스크립트" → 쇼츠/미드폼 대본
2. **상품 설명 자동 작성**: 큐레이션 코멘트 AI 제안
3. **썸네일 키워드 제안**: 상품 + 채널 특성 기반

---

## 🗄️ DB 스키마 (Supabase · 8 테이블)

```sql
creators (
  id UUID PRIMARY KEY,
  name TEXT, phone TEXT, email TEXT,
  shop_slug TEXT UNIQUE,
  portal_token TEXT,
  platform TEXT, channel_url TEXT, subscriber_count INT,
  category TEXT, persona_tier TEXT,
  persona JSONB, status TEXT,
  created_at TIMESTAMPTZ
)

creator_shops (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES creators(id),
  theme JSONB,
  cover_url TEXT, profile_url TEXT, tagline TEXT,
  link_blocks JSONB,
  blocks JSONB DEFAULT '[]',       -- v3.0: 블록 에디터 데이터
  custom_domain TEXT,
  created_at TIMESTAMPTZ
)

products (
  id UUID PRIMARY KEY,
  source_type TEXT,  -- 'tubeping_campaign'|'coupang'|'naver'|'own'|'other'
  cafe24_product_id TEXT,
  external_url TEXT,
  affiliate_code TEXT,
  supplier_id UUID,
  name TEXT, category TEXT, price INT, supply_price INT,
  margin_rate NUMERIC, commission_rate NUMERIC,
  scorer_result JSONB, quality_score INT,
  external_reviews JSONB
)

creator_picks (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES creators(id),
  product_id UUID REFERENCES products(id),
  source_type TEXT,          -- v3.0: PICK 자체에도 소스타입
  external_url TEXT,         -- v3.0: 외부 링크 직접 저장
  affiliate_code TEXT,       -- v3.0: 제휴 코드
  source_meta JSONB DEFAULT '{}',  -- v3.0: 소스별 추가정보
  display_order INT,
  visible BOOLEAN DEFAULT true,
  curation_comment TEXT,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  added_at TIMESTAMPTZ
)

campaigns (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES creators(id),
  product_id UUID REFERENCES products(id),
  status TEXT,  -- proposed|approved|content_submitted|running|shipping|settled|archived|cancelled
  type TEXT,    -- group_buy|affiliate|cps
  target_gmv BIGINT, actual_gmv BIGINT,
  commission_rate NUMERIC,
  proposed_at TIMESTAMPTZ, approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ, settled_at TIMESTAMPTZ
)

orders (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  cafe24_order_id TEXT,
  amount INT, status TEXT, customer_hash TEXT,
  created_at TIMESTAMPTZ
)

settlements (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  gross_gmv BIGINT, creator_net BIGINT, tubeping_net BIGINT,
  tax_invoice_no TEXT, due_date DATE, paid_date DATE,
  status TEXT
)

reviews (
  id UUID PRIMARY KEY,
  order_id UUID, campaign_id UUID,
  creator_id UUID, product_id UUID, customer_hash TEXT,
  product_rating INT, product_comment TEXT,
  curation_rating INT, curation_comment TEXT,
  would_rebuy BOOLEAN,
  created_at TIMESTAMPTZ
)
```

---

## 💰 수익 모델 (v3.0 수정)

### 인터뷰 근거
> "인플루언서한테 돈 안 받고 브랜드사에서 다 부담. 10~15%만" (참석자1, 33:41)
> 참석자4: "맞는 것 같다" (34:24)

| 대상 | 과금 | 비고 |
|------|------|------|
| **크리에이터** | **무료** | 모든 기능 무료. 커스텀 도메인 포함 |
| **공급사/브랜드** | 공급 수수료 10~15% | 캠페인별 협의 |
| **쿠팡/네이버** | 0% (기존 제휴 커미션) | 크리에이터 직접 수익 |

---

## 🔄 크리에이터 Journey (v3.0 업데이트)

```
Day 0     Day 1     Day 3     Day 10    Day 17    Day 30    Day 180+
 │         │         │         │         │         │         │
 ├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
 가입      꾸미기    PICK등록   공구시작   공구마감   정산      아카이브판매
 카톡링크   5분      쿠팡링크   영상업로드  자동마감   자동정산   CPS수익
                    붙여넣기
```

**크리에이터 투입 시간**: 최초 세팅 30분 + 공구당 2~3시간
**앱 설치**: 0개
**접점**: 카톡 + 웹 (모바일 우선)

---

## 🎨 디자인 원칙

1. **Zero-touch**: 크리에이터 작업 최소화 (승인·촬영만)
2. **내러티브 우선**: 상품보다 "나는 누구인지"가 먼저 (v3.0 추가)
3. **카톡 우선**: "여기 넣어줘" 한마디면 세팅 완료
4. **큐레이터 정체성**: "판매자"가 아닌 "제안하는 사람"
5. **아카이브 가치**: 공구 종료 후에도 계속 노출·구매 가능 (CPS)
6. **무료 원칙**: 크리에이터에게 돈 안 받음. 공급사가 부담

---

## 🏷️ 벤치마킹 레퍼런스

| 서비스 | 참고 포인트 | 우리가 이기는 점 |
|--------|-----------|----------------|
| **인포크** | 3분 개설 UX, 블록 조립 | 커머스 풀체인 (인포크는 링크만) |
| **마플샵** | 크리에이터 URL, 독립몰 | 멀티소스 PICK + Zero-touch |
| **Ureca** | AI 페르소나, 상품→대본 생성 | 실제 판매·정산까지 (Ureca는 대본만) |
| **WKWK** | 쇼핑 숏폼 자동 편집 | 커머스 운영 (WKWK는 영상 편집만) |
| **카페24** | 유튜브 쇼핑 연동 | 세팅 불필요 (카페24 = 세팅 지옥) |
| **링크인포크** | 링크인바이오 UX | 커스텀 도메인 무료 + 커머스 |

---

## 🚀 구축 순서 (v3.0)

### Phase 1. 멀티소스 PICK 등록 (즉시)
- [ ] MyPicks ↔ DB 연결 (API 이미 존재)
- [ ] 5개 소스별 등록 UI (공구/쿠팡/네이버/직접/기타)
- [ ] 쿠팡 URL 자동 파싱 (lib/coupang-sign.ts 활용)
- [ ] 순서 변경·노출/숨김·코멘트 DB 저장

### Phase 2. 블록 에디터 공개몰 (즉시)
- [ ] blocks JSONB 컬럼 추가
- [ ] 블록 타입 12종 렌더러
- [ ] 대시보드: 드래그&드롭 블록 편집기
- [ ] shop/[slug] → blocks 기반 렌더링

### Phase 3. 커스텀 도메인
- [ ] 도메인 입력 UI (Settings 탭)
- [ ] middleware.ts 커스텀 도메인 라우팅
- [ ] Vercel API 도메인 등록 자동화
- [ ] CNAME 설정 안내 가이드

### Phase 4. 상품 추천 실데이터 연동
- [ ] YouTube Data API 연동
- [ ] CSV 업로드 파싱 (YouTube Studio)
- [ ] 쿠팡 파트너스 API 실적 조회
- [ ] TubePing 판매 DB 기반 추천
- [ ] 품질 스코어링 (네이버 리뷰 + 업체 업력)

### Phase 5. 캠페인 플로우 정교화
- [ ] 제안→수락→콘텐츠 업로드→승인→라이브→아카이브 단계
- [ ] CPS 장기판매 자동 전환
- [ ] 공구 종료 → 아카이브 상태 전환

### Phase 6. 수익·정산
- [ ] 멀티소스 통합 수익 대시보드
- [ ] 카페24 주문 Webhook → orders
- [ ] 쿠팡파트너스 수익 집계
- [ ] 자동 정산 + 세금계산서

### Phase 7. AI 보조
- [ ] 상품→스크립트 생성 (Claude API)
- [ ] 큐레이션 코멘트 AI 제안
- [ ] 썸네일 키워드 제안

### Phase 8. 카톡 알림톡
- [ ] Solapi 연동
- [ ] "여기 넣어줘" 카톡 → 자동 PICK 등록

---

## 📝 인터뷰 핵심 인사이트 (2026-04-15)

### 검증된 가설
| 가설 | 결과 | 근거 |
|------|------|------|
| 큐레이터 정체성 | ✅ 강력 확인 | "뭐 파는 애 → 아닌 제안해주는 느낌이 판매율 올린다" |
| Zero-touch | ✅ 강력 확인 | "난 아무것도 안 하고 싶어 그냥 공부만 하고 싶어" |
| 멀티소스 | ✅ 확인 | "쿠팡 네이버 카페24 한번에 — 너무 좋은 것 같아요" |
| 카톡+링크, 앱 No | ✅ 확인 | "손가락 한 번만 입력 — 획기적" |
| 커미션 20% | ⚠️ 수정 | 10~15%가 현실적. 크리에이터 무료가 핵심 |

### 새로 발견된 니즈
- 내러티브 페이지 필요 (상품보다 "나는 누구" 먼저)
- 커스텀 도메인 무료 제공 (링크인포크 10만원/월 대비)
- 품질 검증 스코어 (성분·리뷰·업력 기반)
- CPS 장기판매 (공구 종료 후 아카이브)
- 쇼츠=발견, 롱폼=전환 (콘텐츠 타입별 전략)
- YouTube Studio CSV 업로드 분석

---

## 🛠️ 기술 스택

| 레이어 | 스택 |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind |
| DB | Supabase (Postgres + Auth + RLS) |
| Engine | Python (기존 tubeping-sourcing) |
| AI | Claude API (대본 생성·코멘트 제안) |
| External | 카페24 · 쿠팡파트너스 API · Solapi(카톡) · Vercel API(도메인) |

---

## 🎨 브랜드 규칙 (CLAUDE.md 준수)

- **Tube**: `#C41E1E` (빨강)
- **Ping**: `#111111` (검정)
- **로고 표기**: **Tube**Ping (항상 이 색상 조합)
- **Primary 버튼**: bg `#C41E1E`, hover `#A01818`
- **Tailwind 기본 색상 금지** (brand hex만 사용)
