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

        <Section title="제9조 (회원의 ID·비밀번호 관리)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 본인의 ID(이메일) 및 비밀번호 관리를 철저히 해야 하며, 관리 소홀·부정 사용으로 발생하는 결과에 대한 책임은 회원 본인에게 있습니다.</li>
            <li>회원은 본인의 ID·비밀번호를 타인에게 양도·대여하거나 공유할 수 없습니다.</li>
            <li>ID·비밀번호 도용 사실을 인지한 경우 회원은 즉시 회사에 통지해야 하며, 회사의 안내에 따라야 합니다.</li>
            <li>제3항의 규정에도 불구하고 회원이 회사에 도용 사실을 통지하지 않거나 통지 후 회사의 안내에 따르지 않아 발생한 불이익에 대해 회사는 책임지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (게시물·콘텐츠의 관리)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원이 서비스에 등록·게시한 PICK, 공구 정보, 쇼핑몰 콘텐츠, 자동응답 메시지 등 일체의 게시물에 관한 권리와 책임은 게시한 회원에게 있습니다.</li>
            <li>회사는 회원의 게시물에 대해 서비스 내 게재·검색·노출 권한을 가지며, 게재한 회원의 동의 없이 영리적 목적으로 사용하지 않습니다.</li>
            <li>회원이 서비스 내 게시하는 게시물은 검색 결과, 공개 쇼핑몰 페이지, 관련 프로모션 등에 노출될 수 있으며, 노출에 필요한 범위에서 일부 수정·복제·편집되어 게시될 수 있습니다.</li>
            <li>회사는 본 약관 또는 관계 법령에 위반되는 내용을 담은 게시물을 수정·삭제하거나 검색 결과에서 제외할 권한을 갖습니다.</li>
            <li>회원은 언제든지 본인 계정 또는 고객센터를 통해 본인 게시물의 삭제·검색 제외·비공개 조치를 요청할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제11조 (광고 게재 및 정보 제공)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 서비스 운영과 관련하여 회사·제휴사의 광고를 서비스 화면 또는 게시물과 결합해 게재할 수 있습니다.</li>
            <li>회사는 회원의 사전 동의를 받아 이메일·SMS·카카오톡 등을 통해 마케팅·이벤트 정보를 제공할 수 있으며, 회원은 언제든 수신 거부할 수 있습니다.</li>
            <li>다음 각 호의 경우 회원의 동의 여부와 무관하게 이메일 발송이 가능합니다:
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>이용 신청 시 입력한 이메일 인증을 위한 메일</li>
                <li>비밀번호 재설정 등 본인 확인 메일</li>
                <li>서비스 제공상 회원이 반드시 알아야 하는 중대한 공지</li>
              </ul>
            </li>
            <li>회원이 광고를 통해 광고주와 직접 거래·교신하는 것은 회원과 광고주 간의 문제이며, 회사는 이와 관련한 책임을 지지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제12조 (권리 귀속 및 지식재산권)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사가 작성·제공하는 서비스(소프트웨어, 디자인, 로고, 텍스트, 그래픽 등)에 관한 저작권 및 지식재산권은 회사에 귀속됩니다.</li>
            <li>본 약관은 회원에게 서비스에 대한 비독점적·양도불가능한 사용권만을 부여하며, 회원은 이를 양도·판매·담보 제공할 수 없습니다.</li>
            <li>회원이 서비스에 등록한 콘텐츠의 저작권은 회원에게 귀속되나, 회원은 회사가 서비스 운영·홍보·검색 노출 목적으로 해당 콘텐츠를 이용할 수 있도록 비독점적·무상 라이선스를 회사에 부여합니다.</li>
          </ol>
        </Section>

        <Section title="제13조 (회원의 탈퇴 및 자격 상실)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 설정 → 계정 메뉴에서 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 자격을 상실시킵니다.</li>
            <li>회사는 다음 각 호의 사유가 있는 경우, 해당 회원에 대해 사전 통지 후 강제 탈퇴 조치할 수 있습니다:
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>회원가입 시 허위 정보 기재 또는 타인의 명의·정보 도용</li>
                <li>본 약관 또는 회사 운영 정책의 반복적 위반</li>
                <li>다른 회원·제3자의 권리·명예·신용·정당한 이익을 침해한 경우</li>
                <li>회사의 정상적 서비스 제공을 고의로 방해한 경우</li>
                <li>공공질서·미풍양속에 반하는 거래·행위를 한 경우</li>
                <li>외부 플랫폼(Meta, Google, Cafe24 등) 정책 위반으로 해당 플랫폼에서 제재받은 경우</li>
              </ul>
            </li>
            <li>회사는 강제 탈퇴 조치 전 회원에게 이의신청 기회를 부여하며, 회원의 이의신청이 정당하다고 판단되면 즉시 서비스 이용을 재개합니다.</li>
            <li>탈퇴 시 본인 데이터는 「개인정보처리방침」에 따라 처리됩니다. 다만 관계 법령상 보관 의무가 있는 데이터는 일정 기간 분리 보관됩니다.</li>
          </ol>
        </Section>

        <Section title="제14조 (책임의 제한 및 면책)">
          <p className="text-sm">회사는 다음 각 호의 경우 발생한 손해에 대해 책임지지 않습니다.</p>
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>천재지변, 전시·사변·국가비상사태 등 불가항력 사유</li>
            <li>기간통신사업자의 서비스 제공 중단 또는 전력 공급 중단</li>
            <li>해커의 침입, 컴퓨터 바이러스 등으로 인한 시스템 장애</li>
            <li>외부 플랫폼(Meta, Google, Cafe24, 쿠팡, 네이버 등)의 정책 변경·장애·권한 거절</li>
            <li>회원의 귀책사유로 발생한 손해 (계정 정보 유출, 부적절한 콘텐츠 등록 등)</li>
            <li>회원이 등록한 게시물의 정확성·합법성·제3자 권리 침해 여부</li>
            <li>회원 간 또는 회원과 제3자 간의 분쟁</li>
            <li>회원이 서비스를 통해 연결된 외부 사이트에서 거래·발생한 손해</li>
            <li>회사의 합리적 통제를 벗어난 보안 문제 (현재 보안 기술로 방어 곤란한 네트워크 공격 등)</li>
          </ol>
        </Section>

        <Section title="제15조 (분쟁의 해결 및 관할)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관 또는 서비스는 대한민국 법령에 따라 규정·이행됩니다.</li>
            <li>서비스 이용과 관련하여 회사와 회원 간 분쟁이 발생한 경우, 양 당사자는 분쟁 해결을 위해 성실히 협의합니다.</li>
            <li>협의에도 분쟁이 해결되지 않을 경우 민사소송법상의 관할 법원에 소를 제기할 수 있으며, <b>회사 본사 소재지를 관할하는 법원을 전속 관할법원</b>으로 합니다.</li>
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
