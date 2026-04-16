import type { Metadata } from "next";

// 테스트용 — 나중에 DB에서 가져옴
const SHOP_META: Record<string, { name: string; bio: string }> = {
  gwibinjeong: {
    name: "귀빈정",
    bio: "26년 전통 맛집! 국산 재료로 정성껏 만든 먹거리",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = SHOP_META[slug];

  if (!shop) {
    return { title: "TubePing" };
  }

  const title = `${shop.name} | TubePing`;
  const description = shop.bio;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "TubePing",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
