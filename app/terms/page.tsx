export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">이용약관</h1>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제1조 (목적)</h2>
          <p>
            이 약관은 ㈜신산애널리틱스(이하 &quot;회사&quot;)가 운영하는 TubePing 서비스(이하 &quot;서비스&quot;)의
            이용에 관한 조건 및 절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제2조 (정의)</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>&quot;서비스&quot;란 회사가 제공하는 크리에이터 커머스 플랫폼을 말합니다.</li>
            <li>&quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 크리에이터 및 소비자를 말합니다.</li>
            <li>&quot;크리에이터&quot;란 서비스에 가입하여 쇼핑몰을 운영하는 콘텐츠 창작자를 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제3조 (서비스 이용)</h2>
          <p>
            서비스는 크리에이터가 상품을 큐레이션하여 소비자에게 추천·판매할 수 있는 플랫폼을 제공합니다.
            회사는 상품 소싱, 물류, CS, 정산을 대행하며, 크리에이터는 상품 선택 및 콘텐츠 제작에 집중합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제4조 (회원가입 및 탈퇴)</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>이용자는 회사가 정한 양식에 따라 회원가입을 신청합니다.</li>
            <li>회원은 언제든지 회원탈퇴를 요청할 수 있으며, 회사는 즉시 처리합니다.</li>
            <li>탈퇴 시 미정산 수익은 정산 완료 후 지급됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제5조 (수수료 및 정산)</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>공구 수수료율은 개별 캠페인 제안 시 명시됩니다.</li>
            <li>정산은 매월 5일 이전 월 매출 기준으로 진행됩니다.</li>
            <li>어필리에이트 수익(쿠팡, 네이버 등)은 해당 플랫폼 정책에 따릅니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제6조 (면책)</h2>
          <p>
            회사는 천재지변, 불가항력, 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.
            어필리에이트 링크를 통한 외부 거래는 해당 플랫폼의 약관을 따릅니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">제7조 (준거법)</h2>
          <p>이 약관은 대한민국 법률에 따라 해석되고, 분쟁 발생 시 서울중앙지방법원을 관할법원으로 합니다.</p>
        </section>

        <p className="mt-8 text-xs text-gray-400">시행일: 2026년 4월 6일</p>
      </div>

      <div className="mt-8">
        <a href="/onboarding" className="text-sm text-[#C41E1E] hover:underline">← 돌아가기</a>
      </div>
    </div>
  );
}
