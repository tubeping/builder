export async function GET() {
  const baseUrl = "https://tubeping.site";
  const now = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TubePing — 유튜브 쇼핑 채널 올인원 커머스</title>
    <link>${baseUrl}</link>
    <description>인플루언서는 콘텐츠에만 집중하세요. 상품 소싱부터 배송·CS까지 TubePing이 합니다. 신산애널리틱스 운영.</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>TubePing — SNS 커머스 풀필먼트 서비스</title>
      <link>${baseUrl}</link>
      <description>유튜브 쇼핑 채널을 위한 올인원 커머스 플랫폼. 상품 소싱, 쇼핑몰 구축, 배송·CS, 판매·마케팅까지. 23+ 파트너 유튜버, 1,000만+ 누적 구독자. 초기 투자비 0원.</description>
      <pubDate>${now}</pubDate>
      <guid>${baseUrl}</guid>
    </item>
    <item>
      <title>인플루언서 입점 신청 안내</title>
      <link>${baseUrl}#contact</link>
      <description>유튜버, 인스타그래머, 틱톡커 누구나 무료로 입점 신청 가능합니다. 채널 분석 후 맞춤 상품을 추천해드립니다.</description>
      <pubDate>${now}</pubDate>
      <guid>${baseUrl}#contact</guid>
    </item>
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
