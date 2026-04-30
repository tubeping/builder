import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "TubePing 서비스 이용약관",
};

const LAST_UPDATED = "2026-04-30";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <article className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-gray-200 pb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">서비스 이용약관</h1>
          <p className="mt-2 text-sm text-gray-500">최종 수정일: {LAST_UPDATED}</p>
          <p className="mt-1 text-sm text-gray-500">
            본 약관은 ㈜신산애널리틱스(이하 &ldquo;회사&rdquo;)가 제공하는 TubePing 서비스(이하 &ldquo;서비스&rdquo;)의
            이용 조건과 절차, 회사와 회원의 권리·의무를 규정합니다.
          </p>
        </header>

        <Section title="제1조 (목적)">
          <p>본 약관은 회사가 운영하는 서비스의 이용 조건과 절차, 이용자와 회사의 권리·의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </Section>

        <Section title="제2조 (정의)">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>&ldquo;서비스&rdquo;</b>: 크리에이터가 자신의 PICK 큐레이션, 공구 캠페인, 외부 플랫폼 연동 통계를 운영할 수 있도록 회사가 제공하는 일체의 기능.</li>
            <li><b>&ldquo;회원&rdquo;</b>: 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자.</li>
            <li><b>&ldquo;크리에이터&rdquo;</b>: YouTube, Instagram 등에서 콘텐츠를 제작·발행하는 회원.</li>
            <li><b>&ldquo;공구&rdquo;</b>: 회원이 팔로워에게 추천·판매하는 공동구매 캠페인.</li>
            <li><b>&ldquo;외부 플랫폼&rdquo;</b>: YouTube, Instagram, Cafe24, 쿠팡 파트너스, 네이버 등 회원이 연동하는 제3자 서비스.</li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관은 서비스를 이용하고자 하는 모든 회원에게 적용됩니다.</li>
            <li>회사는 관계 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 시행일 7일 전(불리한 변경의 경우 30일 전)부터 공지합니다.</li>
            <li>회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (회원가입)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용자는 회사가 정한 가입 양식에 따라 정보를 입력하고 본 약관 및 개인정보처리방침에 동의함으로써 가입을 신청합니다.</li>
            <li>회사는 다음 각 호에 해당하는 신청을 거절하거나 사후 해지할 수 있습니다.
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>실명이 아니거나 타인의 명의를 도용한 경우</li>
                <li>허위의 정보를 기재한 경우</li>
                <li>만 14세 미만인 경우 (보호자 동의 없는 경우)</li>
                <li>관계 법령 또는 공공질서·미풍양속에 위배될 우려가 있는 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제5조 (회원의 의무)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 본 약관, 관계 법령, 회사의 운영정책을 준수해야 합니다.</li>
            <li>회원은 자신의 계정 정보를 타인에게 양도·대여할 수 없으며, 도용 시 회사에 즉시 통보해야 합니다.</li>
            <li>회원은 자신이 등록·발행하는 PICK, 공구, 콘텐츠가 제3자의 권리(저작권·상표권·초상권 등)를 침해하지 않음을 보증합니다.</li>
            <li>회원이 외부 플랫폼을 연동하여 발생하는 모든 활동(공구 운영, 광고, DM 발송 등)에 대해 해당 플랫폼의 이용약관을 준수할 책임은 회원에게 있습니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (서비스의 제공 및 변경)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 회원에게 다음 서비스를 제공합니다.
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>크리에이터 쇼핑몰(공개 페이지) 생성·관리</li>
                <li>PICK 큐레이션 및 외부 상품 링크 관리</li>
                <li>공구 캠페인 등록·운영, 알림 신청 관리</li>
                <li>외부 플랫폼 연동 및 통계 제공</li>
                <li>자동응답(DM/댓글) 등 자동화 기능</li>
                <li>기타 회사가 추가로 개발하거나 제휴를 통해 제공하는 서비스</li>
              </ul>
            </li>
            <li>회사는 운영상·기술상 사유로 서비스 내용을 변경할 수 있으며, 변경 시 사전 공지합니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (외부 플랫폼 연동)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 자신의 의사로 외부 플랫폼을 연동할 수 있으며, 연동 시 해당 플랫폼이 요구하는 권한 범위 내에서만 데이터를 수집·이용합니다.</li>
            <li>외부 플랫폼의 정책 변경, 장애, 권한 거절 등으로 발생하는 기능 제한에 대해 회사는 책임을 지지 않습니다.</li>
            <li>회원은 언제든지 연동을 해제할 수 있으며, 해제 시 관련 데이터는 즉시 삭제됩니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (정산 및 수수료)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사가 직접 운영하는 공구(Cafe24 연동)의 경우, 판매가에서 공급가·결제수수료·세금을 차감한 순마진을 회사 40%·크리에이터 60% 비율로 정산합니다(별도 약정이 있는 경우 그에 따름).</li>
            <li>외부 플랫폼(쿠팡 파트너스, 네이버 쇼핑커넥트 등) 발생 수수료는 해당 플랫폼이 회원 본인 계좌로 직접 지급하며, 회사는 중간 정산에 관여하지 않습니다.</li>
            <li>정산 주기·방법·세부 조건은 별도 정산 안내를 따릅니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (회원의 탈퇴 및 자격 상실)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 설정 페이지에서 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 자격을 상실시킵니다.</li>
            <li>회사는 회원이 본 약관을 위반하거나 관계 법령에 위배되는 행위를 한 경우, 사전 통지 후 자격을 정지·상실시킬 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (책임의 제한)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 천재지변, 외부 플랫폼 장애, 회원의 귀책사유로 인한 손해에 대해 책임을 지지 않습니다.</li>
            <li>회원이 등록한 콘텐츠의 정확성·합법성에 대한 책임은 회원에게 있습니다.</li>
            <li>회사는 회원 간 또는 회원과 제3자 간 분쟁에 개입하지 않으며, 이로 인한 손해를 배상할 책임이 없습니다.</li>
          </ol>
        </Section>

        <Section title="제11조 (분쟁의 해결 및 관할)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관과 관련된 분쟁은 대한민국 법령에 따라 해결합니다.</li>
            <li>회사와 회원 간 발생한 소송은 민사소송법상의 관할 법원을 따릅니다.</li>
          </ol>
        </Section>

        <Section title="부칙">
          <p>본 약관은 {LAST_UPDATED}부터 시행됩니다.</p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
          <p>관련 문서: <a href="/privacy" className="text-[#C41E1E] hover:underline">개인정보처리방침</a> · <a href="/data-deletion" className="text-[#C41E1E] hover:underline">데이터 삭제 요청</a></p>
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
