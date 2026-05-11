import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "TubePing 개인정보처리방침",
};

const LAST_UPDATED = "2026-04-30";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <article className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-gray-500">최종 수정일: {LAST_UPDATED}</p>
          <p className="mt-1 text-sm text-gray-500">
            ㈜신산애널리틱스(이하 &ldquo;회사&rdquo;)는 TubePing 서비스(이하 &ldquo;서비스&rdquo;) 이용자의
            개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
          </p>
        </header>

        <Section title="1. 수집하는 개인정보 항목">
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-bold mb-1">1-1. 회원가입 시</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><b>필수</b>: 이메일 주소, 비밀번호(암호화 저장), 이름(또는 닉네임)</li>
                <li><b>선택</b>: 프로필 사진, 자기소개</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-1">1-2. 본인 인증 / 소셜 로그인 시</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Google OAuth 가입: Google 프로필 이름, 이메일, 프로필 이미지 URL</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-1">1-3. 쇼핑몰 운영 정보</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>채널 URL, 활동 플랫폼, 카테고리, 쇼핑몰 슬러그(shop_slug)</li>
                <li>큐레이션 PICK, 공구 캠페인, 자동응답 규칙</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-1">1-4. 정산 및 세무 신고 시 (해당하는 경우)</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>이름, 주민등록번호(원천징수 의무 이행), 계좌은행·번호·예금주명, 사업자등록번호</li>
                <li>※ 주민등록번호 수집 근거: 소득세법 제145조·제164조</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-1">1-5. 서비스 이용 과정에서 자동 수집되는 정보</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>단말기 정보: OS, 디바이스 모델, 화면 사이즈</li>
                <li>접속 IP (SHA-256 해시 16자만 저장, 원본 미보관)</li>
                <li>User-Agent, 쿠키, 접속 일시, 페이지/화면 이동, 클릭 이벤트</li>
                <li>장애·부정 이용 모니터링 기록</li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-1">1-6. 외부 플랫폼 연동 시 (별도 동의 후 수집)</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><b>YouTube</b>: 채널 ID·구독자 수·영상 통계(조회/좋아요/댓글)</li>
                <li><b>Instagram</b>: 비즈니스 계정 ID·프로필·게시물 인사이트·DM·코멘트</li>
                <li><b>Cafe24</b>: 주문·상품·고객 데이터(공구 운영 목적)</li>
                <li><b>쿠팡 파트너스</b>: 본인 API 키 기반 실적·커미션 데이터</li>
                <li><b>네이버</b>: 사용자가 직접 입력한 실적 데이터</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            <li>회원 가입 및 본인 확인, 서비스 제공·운영</li>
            <li>크리에이터 쇼핑몰 생성·관리, PICK 큐레이션, 통계 제공</li>
            <li>외부 플랫폼(YouTube, Instagram, Cafe24, 쿠팡 등) 연동 및 데이터 동기화</li>
            <li>고객 문의 응대 및 공지사항 전달</li>
            <li>부정 이용 방지, 서비스 품질 개선, 통계 분석</li>
            <li>법령상 의무 이행</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p className="text-sm text-gray-700 leading-relaxed">
            회사는 회원 탈퇴 시 또는 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
            다만, 관계 법령에 따라 보관이 필요한 경우 아래 기간 동안 보관합니다.
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>계약 또는 청약 철회 등에 관한 기록: <b>5년</b> (전자상거래법)</li>
            <li>대금 결제 및 재화 등의 공급에 관한 기록: <b>5년</b> (전자상거래법)</li>
            <li>소비자 불만 또는 분쟁 처리에 관한 기록: <b>3년</b> (전자상거래법)</li>
            <li>접속 로그, IP 정보: <b>3개월</b> (통신비밀보호법)</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p className="text-sm text-gray-700 leading-relaxed">
            회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자가
            외부 플랫폼(Google, Meta(Instagram/Facebook), Cafe24, 쿠팡 파트너스, 네이버 등)을
            연동하는 경우, 해당 플랫폼이 요구하는 범위 내에서 인증 정보 및 데이터가 연결되며,
            이는 각 플랫폼의 개인정보 정책을 따릅니다.
          </p>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          <p className="text-sm text-gray-700 leading-relaxed">
            서비스 운영을 위해 다음 업체에 개인정보 처리 업무를 위탁하고 있습니다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-bold">수탁자</th>
                  <th className="text-left p-2 font-bold">위탁 업무</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-2">Supabase, Inc.</td><td className="p-2">데이터베이스 및 인증 시스템 운영</td></tr>
                <tr><td className="p-2">Vercel, Inc.</td><td className="p-2">웹 서비스 호스팅</td></tr>
                <tr><td className="p-2">Google LLC</td><td className="p-2">소셜 로그인(OAuth), YouTube 데이터 연동</td></tr>
                <tr><td className="p-2">Meta Platforms, Inc.</td><td className="p-2">Instagram 비즈니스 데이터 연동</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. 이용자의 권리와 행사 방법">
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            <li>개인정보 열람·정정·삭제·처리정지 요구</li>
            <li>회원 탈퇴 시 모든 개인정보는 즉시 파기 (법령상 보관 항목 제외)</li>
            <li>외부 플랫폼 연동 해제 시 해당 데이터 즉시 삭제</li>
            <li>요청 방법: <a href="mailto:master@shinsananalytics.com" className="text-[#C41E1E] underline">master@shinsananalytics.com</a> 또는 <a href="/data-deletion" className="text-[#C41E1E] underline">데이터 삭제 요청 페이지</a></li>
          </ul>
        </Section>

        <Section title="7. 개인정보의 안전성 확보 조치 (개인정보보호법 제29조)">
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            <li><b>내부관리계획 수립·시행</b>: 개인정보 안전한 처리를 위한 내부 관리계획 운영</li>
            <li><b>접근 권한 최소화·통제</b>: 개인정보 처리 직원 지정 및 권한 부여·변경·말소 관리</li>
            <li><b>비밀번호 암호화</b>: bcrypt 단방향 해시로 저장 (원본 비밀번호 회사도 알 수 없음)</li>
            <li><b>외부 플랫폼 토큰 암호화</b>: OAuth access·refresh token 암호화 보관</li>
            <li><b>접속 IP 해시 처리</b>: SHA-256 + salt 처리 후 16자만 저장, 원본 IP 미보관</li>
            <li><b>접속 기록 보관·위변조 방지</b>: 최소 6개월 이상 보관, 무결성 검증</li>
            <li><b>해킹·바이러스 대비 기술적 대책</b>: 침입 차단 시스템, 보안 프로그램 주기적 갱신·점검</li>
            <li><b>정기 자체 감사</b>: 분기 1회 개인정보 처리 자체 감사 실시</li>
            <li><b>물리적 접근 통제</b>: 클라우드 인프라(Supabase, Vercel) 인증된 데이터센터 운영</li>
          </ul>
        </Section>

        <Section title="8. 쿠키 및 유사 기술 / 자동 수집 거부">
          <p className="text-sm text-gray-700 leading-relaxed">
            서비스 이용 통계 분석 및 로그인 유지를 위해 쿠키 및 유사 기술을 사용합니다. 이용자는
            브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능(자동 로그인 등) 이용에
            제한이 있을 수 있습니다.
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li><b>Chrome</b>: 설정 → 개인정보 보호 및 보안 → 쿠키 및 기타 사이트 데이터</li>
            <li><b>Safari</b>: 환경설정 → 개인정보 보호 → 쿠키 및 웹사이트 데이터</li>
            <li><b>Firefox</b>: 설정 → 개인정보 및 보안 → 쿠키 및 사이트 데이터</li>
          </ul>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            모바일 단말의 광고식별자(ADID/IDFA) 재설정·추적 제한 기능을 통해 자동 수집을 거부할 수
            있으며, 거부 시 일부 개인화 기능 이용이 제한될 수 있습니다.
          </p>
        </Section>

        <Section title="9. 개인정보 유효기간제 (장기 미이용자 분리 보관)">
          <p className="text-sm text-gray-700 leading-relaxed">
            정보통신망법에 따라 <b>1년간 서비스를 이용하지 않은 회원</b>의 개인정보는 별도로 분리하여
            보관·관리합니다. 분리 보관된 개인정보는 <b>4년간 보관 후 지체 없이 파기</b>합니다.
          </p>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            분리 보관 전 30일 전 이메일로 사전 통지하며, 회원이 재이용 의사를 표시하면 정상 계정으로
            복원됩니다.
          </p>
        </Section>

        <Section title="10. 개인정보 보호책임자">
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
            <p><b>회사명</b>: ㈜신산애널리틱스</p>
            <p><b>책임자</b>: 대표이사 최준</p>
            <p><b>이메일</b>: <a href="mailto:master@shinsananalytics.com" className="text-[#C41E1E] underline">master@shinsananalytics.com</a></p>
          </div>
        </Section>

        <Section title="11. 정보주체의 권익침해 구제방법">
          <p className="text-sm text-gray-700 leading-relaxed">
            회사의 자체 처리 결과에 만족하지 못하시거나 개인정보 침해 관련 신고·상담이 필요한
            경우, 아래 외부 기관에 도움을 요청하실 수 있습니다.
          </p>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold">개인정보 침해신고센터 (한국인터넷진흥원 KISA)</p>
              <p className="text-xs text-gray-500 mt-0.5">개인정보 침해 사실 신고·상담</p>
              <p className="text-xs mt-1">📞 (국번 없이) 118 · 🌐 <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">privacy.kisa.or.kr</a></p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold">개인정보 분쟁조정위원회</p>
              <p className="text-xs text-gray-500 mt-0.5">개인정보 분쟁조정·집단분쟁조정 (민사적 해결)</p>
              <p className="text-xs mt-1">📞 1833-6972 · 🌐 <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">www.kopico.go.kr</a></p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold">개인정보보호위원회</p>
              <p className="text-xs mt-1">🌐 <a href="https://www.privacy.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">www.privacy.go.kr</a></p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold">대검찰청 사이버범죄수사단</p>
              <p className="text-xs mt-1">📞 02-3480-3573 · 🌐 <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">www.spo.go.kr</a></p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="font-bold">경찰청 사이버수사국</p>
              <p className="text-xs mt-1">📞 (국번 없이) 182 · 🌐 <a href="https://ecrm.police.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">ecrm.police.go.kr</a></p>
            </div>
          </div>
        </Section>

        <Section title="12. 정책 변경">
          <p className="text-sm text-gray-700 leading-relaxed">
            본 방침은 법령·정책 또는 보안 기술의 변경에 따라 수정될 수 있으며, 변경 시 홈페이지를
            통해 게시한 날로부터 7일 후 효력이 발생합니다. 수집 항목 또는 이용 목적의 변경 등
            이용자 권리의 중대한 변경이 있는 경우 최소 30일 전 사전 공지합니다.
          </p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <p>관련 약관: <a href="/terms" className="text-[#C41E1E] hover:underline">이용약관</a> · <a href="/data-deletion" className="text-[#C41E1E] hover:underline">데이터 삭제 요청</a></p>
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}
