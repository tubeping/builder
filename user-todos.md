# TubePing Builder — 사용자 To-Do

## 페르소나 자동 추출 (2026-05-14 추가)

### 1. YouTube Data API v3 키 발급
- [ ] Google Cloud Console에서 프로젝트 생성/선택
- [ ] "API 및 서비스 → 라이브러리"에서 **YouTube Data API v3** 활성화
- [ ] "API 및 서비스 → 사용자 인증 정보 → API 키 만들기"로 키 발급
- [ ] **할당량 권장**: 일 10,000 유닛 (기본값) → 채널 추출 1회당 약 5~7 유닛 소비. 100 채널/일 정도까지 무난
- [ ] 보안: API 키 제한 (IP 제한 또는 HTTP referrer 제한 권장). 키 노출 시 즉시 폐기·재발급

### 2. 환경 변수 등록
- [ ] 로컬: `.env.local`에 `YOUTUBE_API_KEY=발급키` 추가 → dev 서버 재시작
- [ ] Vercel: 대시보드 → tubeping_builder 프로젝트 → Settings → Environment Variables → `YOUTUBE_API_KEY` 추가 (Production/Preview/Development 셋 다)
- [ ] 결과: 페르소나 탭에서 채널 분석 시 "샘플 데이터" 배지가 사라지고 실제 데이터로 채워짐

### 3. (선택) 인스타그램 자동 추출 — 2차
- 1차 범위에서 제외. 핸들 입력란만 있고 "곧 지원" 표시 중.
- Instagram Graph API는 비즈니스 계정 + Facebook 페이지 연결 + OAuth 토큰 필요. 별도 기획 필요.

---

## 기록 — 작업 입력 끝나면 체크
업무 결과 입력 위치: 페르소나 도출 탭에서 "다시 분석" 버튼 한 번 눌러보면 동작 확인 가능.
