import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "데이터 삭제 요청",
  description: "TubePing — 사용자 데이터 삭제 안내",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <article className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">사용자 데이터 삭제 요청</h1>
          <p className="mt-2 text-sm text-gray-500">
            TubePing은 회원의 개인정보 자기결정권을 존중하며, 언제든지 본인의 데이터를 열람·정정·삭제할 수
            있는 절차를 제공합니다.
          </p>
        </header>

        <Section title="1. 자동 삭제 — 회원 탈퇴">
          <p>가장 빠른 방법은 서비스 내에서 직접 탈퇴하는 것입니다.</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>로그인 후 <a href="/dashboard" className="text-[#C41E1E] underline">대시보드</a> → <b>설정 → 계정 → 회원 탈퇴</b> 진입</li>
            <li>비밀번호 또는 소셜 로그인 재인증</li>
            <li>&ldquo;탈퇴하기&rdquo; 클릭</li>
            <li>즉시 모든 개인정보가 영구 삭제되며, 외부 플랫폼 연동(YouTube/Instagram/Cafe24/쿠팡 등)도 자동 해제됩니다</li>
          </ol>
        </Section>

        <Section title="2. 외부 플랫폼별 연동 해제">
          <p>특정 플랫폼만 해제하고자 하는 경우, 다음 두 가지 방법이 있습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><b>TubePing 내 해제</b>: 대시보드 → 연동 관리 → 해당 플랫폼 → &ldquo;연동 해제&rdquo;</li>
            <li>
              <b>외부 플랫폼 직접 해제</b>:
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Google: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">myaccount.google.com/permissions</a></li>
                <li>Meta(Instagram/Facebook): <a href="https://accountscenter.meta.com/" target="_blank" rel="noopener noreferrer" className="text-[#C41E1E] underline">accountscenter.meta.com</a> → 비즈니스 통합 → TubePing → 제거</li>
                <li>Cafe24: 카페24 어드민 → 앱 관리 → TubePing 앱 삭제</li>
                <li>쿠팡 파트너스: 본인 API 키 재발급</li>
              </ul>
            </li>
          </ul>
          <p className="mt-2">
            외부에서 해제 시, TubePing은 해당 플랫폼으로부터 받은 콜백을 통해 즉시 해당 데이터(액세스 토큰,
            동기화된 채널 정보 등)를 삭제합니다.
          </p>
        </Section>

        <Section title="3. 이메일로 삭제 요청">
          <p>서비스에 직접 접근이 어려운 경우 이메일로 요청할 수 있습니다.</p>
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
            <p><b>수신자</b>: <a href="mailto:master@shinsananalytics.com?subject=데이터 삭제 요청" className="text-[#C41E1E] underline">master@shinsananalytics.com</a></p>
            <p><b>제목</b>: [데이터 삭제 요청]</p>
            <p><b>본문에 포함할 정보</b>:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>가입 시 사용한 이메일 또는 소셜 계정 식별자</li>
              <li>삭제를 원하는 범위 (전체 / 특정 플랫폼 연동만)</li>
              <li>본인 확인 가능한 추가 정보 (선택)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              회사는 본인 확인 후 <b>영업일 기준 7일 이내</b> 처리 결과를 회신합니다.
            </p>
          </div>
        </Section>

        <Section title="4. 삭제되는 데이터 범위">
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 프로필(이메일, 이름, 채널 정보, 프로필 이미지 등)</li>
            <li>크리에이터 쇼핑몰 설정(테마, 블록 구성, 커버·프로필 이미지)</li>
            <li>PICK 큐레이션, 공구 캠페인 정보, 공구 알림 신청자 매칭 정보</li>
            <li>외부 플랫폼 연동 토큰 및 동기화 데이터 (YouTube 통계, Instagram 메시지·코멘트, Cafe24 주문, 쿠팡 실적 등)</li>
            <li>유입·클릭 로그 (pick_clicks)</li>
            <li>업로드한 이미지(쇼핑몰 자산)</li>
          </ul>
        </Section>

        <Section title="5. 삭제되지 않는 데이터 (법령상 보관 의무)">
          <p>아래 항목은 관계 법령상 일정 기간 보관해야 하므로 즉시 삭제되지 않습니다.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>전자상거래법상 결제·계약·청약철회 기록: <b>5년</b></li>
            <li>전자상거래법상 소비자 불만·분쟁 처리 기록: <b>3년</b></li>
            <li>통신비밀보호법상 접속 로그(해시 처리): <b>3개월</b></li>
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            법정 보관 기간이 종료되면 즉시 파기됩니다.
          </p>
        </Section>

        <Section title="6. 자동 콜백 엔드포인트 (외부 플랫폼용)">
          <p>
            Meta 등 외부 플랫폼이 사용자 삭제 요청을 시스템적으로 통보할 때 사용하는 엔드포인트입니다.
            (개발자 참조용)
          </p>
          <pre className="mt-2 rounded-lg bg-gray-900 text-gray-100 px-4 py-3 text-xs font-mono overflow-x-auto">
{`POST https://tubepingbuilder.vercel.app/api/data-deletion/callback
Content-Type: application/json

{
  "user_id": "<external_user_id>",
  "platform": "meta" | "google" | "cafe24" | "coupang"
}`}
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            엔드포인트는 요청을 받은 즉시 해당 사용자의 외부 플랫폼 데이터를 삭제하고, 처리 결과를 응답합니다.
          </p>
        </Section>

        <Section title="7. 문의">
          <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
            <p><b>회사</b>: ㈜신산애널리틱스</p>
            <p><b>개인정보 보호책임자</b>: 대표이사 최준</p>
            <p><b>이메일</b>: <a href="mailto:master@shinsananalytics.com" className="text-[#C41E1E] underline">master@shinsananalytics.com</a></p>
          </div>
        </Section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <p>관련 문서: <a href="/privacy" className="text-[#C41E1E] hover:underline">개인정보처리방침</a> · <a href="/terms" className="text-[#C41E1E] hover:underline">이용약관</a></p>
        </footer>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
