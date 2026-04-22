# TubePing Builder — Claude 작업 지침

## 작업 실행 규칙
- 모든 파일 생성/수정 작업은 승인 없이 자동으로 진행
- 중간에 yes/no 확인 요청 금지
- 판단이 필요한 경우 최선의 선택을 하고 실행 후 결과 보고

## 프로젝트 개요
크리에이터(유튜버·인플루언서)용 쇼핑몰 빌더.
온보딩 5단계를 거치면 `shop/[slug]` 형태의 개인 공구 쇼핑몰이 자동 생성됨.
운영사: ㈜신산애널리틱스 / 서비스명: 튜핑(TubePing)

## admin과의 관계 ⚠️ 중요
- **현재는 admin(tubeping_admin/)과 완전히 별도로 운영**
- **공구 상품은 공유 예정** — Supabase의 `products`, `orders`, `suppliers` 테이블을 admin과 같이 사용
  (supabase_schema.sql 주석: "기존 테이블 유지")
- 상품 데이터는 admin에서 관리되고, 빌더는 그것을 읽어 크리에이터가 큐레이션/판매
- 향후 **네이버 DataLab + 셀러라이프 기반 상품 추천**(현재 루트 `main.py`, `fetchers/`)을 빌더 안으로 통합 예정

## ⚠️ 다음주(2026-04-21 주간) Vultr 서버 이전 예정
- 현재 **Supabase + Vercel** 구성은 임시. 다음주 **Vultr VPS**로 전체 이전.
- 이전 전까지는 아래 기술 스택·배포 방식이 유효. 이전 후 재작성 필요.

## 기술 스택
- Next.js 16.2.1 App Router + TypeScript + React 19
- Tailwind CSS
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — DB·인증 공용
- 로컬 실행: `npm run dev` → localhost:3000
- 배포: Vercel (프로젝트 `tubeping_builder` — 현재 `tubeping/admin` main 브랜치 참조, 곧 자체 repo로 분리 예정)

## 외부 연동 (lib/ · api/)
- **Supabase** (`lib/supabase.ts`, `supabase-browser.ts`, `supabase-server.ts`) — SSR/클라이언트 분리
- **카페24** (`app/api/cafe24/`) — 상품·카테고리·콜백
- **쿠팡파트너스** (`app/api/coupang/`, `lib/coupang-sign.ts`) — 딥링크·검색 API
- **YouTube Data API** (`app/api/youtube/`) — 크리에이터 채널 분석
- **Insight 파싱** (`app/api/parse-insight/`) — 인사이트 자동 추출

## 핵심 기능·라우트
```
app/
├── page.tsx                ← 랜딩
├── onboarding/             ← 5단계 온보딩 (채널 분석 → 상품 → 스토어 → 로그인 → 완료)
├── dashboard/              ← 크리에이터 전용 대시보드 (상품 관리, 수익)
├── shop/[slug]/            ← 크리에이터별 공개 공구 쇼핑몰 (최종 산출물)
├── blog/                   ← 빌더 자체 블로그
│   └── [slug]/
├── privacy/, terms/        ← 법적 고지
│
└── api/
    ├── apply/              ← 가입 신청
    ├── me/                 ← 현재 크리에이터 정보
    ├── picks/              ← 크리에이터가 고른 상품
    ├── campaigns/          ← 캠페인(공구) 관리
    ├── campaign-notify/    ← 캠페인 알림
    ├── earnings/           ← 수익 정산
    ├── shop/               ← 공개 숍 데이터
    ├── blog/, blog/[slug]/ ← 블로그 CRUD
    ├── cafe24/             ← 카페24 상품 동기화
    ├── coupang/            ← 쿠팡 딥링크·검색
    ├── youtube/            ← 채널 분석
    └── parse-insight/      ← 인사이트 파싱
```

## DB 주요 테이블 (supabase_schema.sql 참고)
- **creators** — 크리에이터 계정 (shop_slug, portal_token, platform)
- **products, orders, suppliers** — admin과 **공유** 테이블
- (빌더 전용 테이블은 schema 파일 확인)

## ⚠️ 과도기 주의사항 (2026-04-14 기준)

### 이 폴더 안의 `app/admin/` 디렉토리는 옛날 잔재
- `app/admin/mall/`, `app/admin/marketing/`, `app/admin/system/` 등은 과거 admin+builder 통합 시절의 코드
- 실제 admin은 별도 폴더 `tubeping_admin/`에 있음
- **신규 개발 금지**. 곧 정리(삭제) 예정.

### 이 폴더에서 `git push` 금지 🚫
- 이 폴더의 git 원격이 `tubeping/admin` repo로 **잘못 연결**되어 있음
- push하면 admin repo에 빌더 코드가 섞여 들어감 (오염)
- 자체 repo `tubeping/builder` 생성 및 재연결 대기 중

### 루트 `C:/tubeping-sourcing/app/`도 잔재
- 루트의 `app/`과 `package.json`(name: `tubeping_builder`)도 구버전 코드
- 현재 살아있는 빌더는 이 폴더(`tubeping_builder/`)가 유일
- 혼동 시 **package.json의 name**이 아니라 **폴더 위치**와 **최근 수정일** 기준으로 판단

## 코딩 컨벤션
- TypeScript (`.tsx`, `.ts`)
- 클라이언트 컴포넌트는 `"use client"` 명시
- Supabase 클라이언트: 서버 컴포넌트에서는 `supabase-server.ts`, 클라이언트에서는 `supabase-browser.ts` 사용
- 공용 컴포넌트 `components/`, 페이지별 컴포넌트 `_components/`
- 하드코딩 금지 — 설정값은 `.env`, 더미데이터는 파일 상단 상수

## 브랜드 규칙 (admin과 공통)
- 빨간색: `#C41E1E` (Tube)
- 검정: `#111111` (Ping)
- 로고: **Tube**Ping (Tube=빨간색, Ping=검정)

## 반응형 규칙 (모바일 필수)
- 크리에이터 대시보드·공개 숍 모두 **모바일이 메인 사용처**
- 그리드: 모바일 1열 → 태블릿 2열 → 데스크톱 3~4열
- Tailwind breakpoint (sm/md/lg/xl) 활용

## 보안 규칙
- `.env` 인증 정보 하드코딩 금지
- Supabase RLS(Row Level Security) 적용 필수 (크리에이터 A가 크리에이터 B 데이터 접근 불가)
- `portal_token` 등 민감값 클라이언트 노출 금지

## 금지 사항
- 기존 작동하는 Supabase/카페24/쿠팡 연동 코드 임의 변경 금지
- `tubeping.site`(홈페이지) 관련 코드 건드리지 말 것
- Write(전체 덮어쓰기) 대신 Edit(부분 수정) 사용
