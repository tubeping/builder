export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">개인정보처리방침</h1>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">1. 수집하는 개인정보 항목</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>필수항목</strong>: 이메일, 이름(채널명), 비밀번호</li>
            <li><strong>선택항목</strong>: 전화번호, 채널 URL, 프로필 이미지, 은행 계좌 정보</li>
            <li><strong>자동 수집</strong>: 접속 IP, 쿠키, 접속 로그, 서비스 이용 기록</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>서비스 제공 및 회원 관리</li>
            <li>공구 캠페인 매칭 및 정산</li>
            <li>어필리에이트 수익 추적</li>
            <li>서비스 개선 및 통계 분석</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
            <li>대금결제·재화공급 기록: 5년 (전자상거래법)</li>
            <li>소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
            <li>접속 로그: 3개월 (통신비밀보호법)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">4. 제3자 제공</h2>
          <p>
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            다만 다음의 경우 예외로 합니다.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
            <li>정산을 위해 결제대행사(PG)에 최소한의 정보 전달</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">5. 개인정보의 파기</h2>
          <p>
            보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다.
            전자적 파일은 복구 불가능한 방법으로 삭제하고, 종이 문서는 분쇄 또는 소각합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">6. 이용자의 권리</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.</li>
            <li>요청은 이메일(support@shinsananalytics.com)로 접수합니다.</li>
            <li>회사는 요청 접수 후 10일 이내에 처리합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">7. 개인정보 보호책임자</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>책임자: 최준 (대표이사)</li>
            <li>이메일: support@shinsananalytics.com</li>
            <li>소속: ㈜신산애널리틱스</li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-gray-400">시행일: 2026년 4월 6일</p>
      </div>

      <div className="mt-8">
        <a href="/onboarding" className="text-sm text-[#C41E1E] hover:underline">← 돌아가기</a>
      </div>
    </div>
  );
}
