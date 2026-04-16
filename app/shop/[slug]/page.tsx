"use client";

import { useState, useEffect } from "react";

// ─── 타입 ───
type ProductSource = "tubeping_campaign" | "coupang" | "naver" | "own" | "other";

interface ShopPick {
  id: string;
  source_type: ProductSource;
  external_url: string | null;
  curation_comment: string | null;
  clicks: number;
  display_order: number;
  source_meta?: Record<string, unknown>;
  product_name?: string;
  price?: number;
  image?: string | null;
  category?: string;
}

interface ShopReview {
  id: string;
  customer_hash: string;
  product_rating: number;
  product_comment: string;
  curation_rating: number;
  curation_comment: string;
  would_rebuy: boolean;
  created_at: string;
}

interface LinkBlock {
  id: string;
  label: string;
  url: string;
  icon: string;
}

interface ShopBlock {
  type: "hero" | "text" | "image" | "gallery" | "banner" | "links" | "picks" | "video" | "divider" | "reviews" | "newsletter" | "html";
  data: Record<string, unknown>;
}

interface ShopApiResponse {
  creator: {
    id: string;
    name: string;
    shop_slug: string;
    channel_url: string;
    subscriber_count: number;
    category: string;
    platform: string;
  };
  shop: {
    cover_url: string | null;
    profile_url: string | null;
    tagline: string | null;
    link_blocks: LinkBlock[];
    blocks: ShopBlock[] | null;
    theme: Record<string, unknown>;
  } | null;
  picks: ShopPick[];
  reviews: ShopReview[];
  activeCampaign: {
    id: string;
    product_id: string;
    status: string;
    target_gmv: number;
    commission_rate: number;
    started_at: string | null;
  } | null;
}

interface DisplayPick {
  id: string;
  name: string;
  price: number;
  image: string | null;
  source: ProductSource;
  category: string;
  buyUrl: string;
  curationComment?: string;
}

// ─── 더미 fallback ───
const FALLBACK_PICKS: DisplayPick[] = [
  { id: "fb1", name: "베베바딥 로션 저자극 고보습 케어 250ml", price: 34000, image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/4cfe2bc2f5a169545a8a5fe25761c3f0.jpg", source: "tubeping_campaign", category: "뷰티", buyUrl: "https://tubeping.cafe24.com/product/detail.html?product_no=2745" },
  { id: "fb2", name: "왕호떡만두 2팩+김치만두 2팩", price: 24900, image: "https://ecimg.cafe24img.com/pg1119b83992236021/shinsana/web/product/medium/20250623/c01e2014421c64300ca8a4c31d0d6ec9.jpg", source: "tubeping_campaign", category: "식품", buyUrl: "https://tubeping.cafe24.com/product/detail.html?product_no=2746" },
  { id: "fb3", name: "에어프라이어 5.5L 대용량", price: 89900, image: null, source: "coupang", category: "생활", buyUrl: "https://www.coupang.com/np/search?q=에어프라이어+5.5L" },
  { id: "fb4", name: "오설록 제주 녹차 선물세트", price: 35000, image: null, source: "naver", category: "식품", buyUrl: "https://smartstore.naver.com/osulloc" },
];

// ─── 유틸 ───
function formatPrice(n: number) { return n.toLocaleString("ko-KR") + "원"; }

function sourceBadge(source: ProductSource) {
  const map: Record<ProductSource, { label: string; style: string }> = {
    tubeping_campaign: { label: "공구", style: "bg-[#C41E1E] text-white" },
    coupang: { label: "쿠팡", style: "bg-[#e44232] text-white" },
    naver: { label: "네이버", style: "bg-[#03C75A] text-white" },
    own: { label: "직접", style: "bg-[#111111] text-white" },
    other: { label: "기타", style: "bg-gray-500 text-white" },
  };
  return map[source] || map.other;
}

function addUtm(url: string, slug: string) {
  if (!url || url === "#") return "#";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=tubeping&utm_medium=shop&utm_campaign=${slug}`;
}

// ─── 블록 렌더러들 ───

function HeroBlock({ data, creator, shop }: { data: Record<string, unknown>; creator: ShopApiResponse["creator"]; shop: ShopApiResponse["shop"] }) {
  const coverUrl = (data.cover_url as string) || shop?.cover_url;
  const profileUrl = (data.profile_url as string) || shop?.profile_url;
  const name = (data.name as string) || creator.name;
  const bio = (data.bio as string) || shop?.tagline || "";
  const [shareToast, setShareToast] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  return (
    <>
      <div className="relative">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="h-36 sm:h-48 w-full object-cover" />
        ) : (
          <div className="flex h-36 sm:h-48 w-full items-center justify-center bg-gradient-to-r from-[#C41E1E] to-[#111111]">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white/90">{name}</span>
          </div>
        )}
        <header className="absolute top-0 left-0 right-0 z-10">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <span className="text-lg font-extrabold tracking-tight drop-shadow-sm">
              <span className="text-white">Tube</span><span className="text-white/70">Ping</span>
            </span>
          </div>
        </header>
      </div>
      <div className="mx-auto max-w-2xl px-3 sm:px-4">
        <div className="relative -mt-8 sm:-mt-10 flex items-end gap-3 sm:gap-4">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gray-200 shadow-sm">
            {profileUrl ? (
              <img src={profileUrl} alt={name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <svg className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{name}</h1>
          </div>
        </div>
        {bio && <p className="mt-2 text-sm text-gray-500">{bio}</p>}
        <button onClick={handleShare} className="mt-3 flex cursor-pointer items-center gap-1.5 rounded-full bg-[#C41E1E] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#A01818]">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          공유하기
        </button>
      </div>
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#111111] px-5 py-2.5 text-sm text-white shadow-lg">
          링크가 복사되었습니다!
        </div>
      )}
    </>
  );
}

function TextBlock({ data }: { data: Record<string, unknown> }) {
  const content = (data.content as string) || "";
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{content}</div>
    </section>
  );
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const url = (data.url as string) || "";
  const caption = (data.caption as string) || "";
  if (!url) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <img src={url} alt={caption} className="w-full rounded-xl" />
      {caption && <p className="mt-2 text-center text-xs text-gray-500">{caption}</p>}
    </section>
  );
}

function GalleryBlock({ data }: { data: Record<string, unknown> }) {
  const images = (data.images as string[]) || [];
  const cols = (data.columns as number) || 2;
  if (images.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
        {images.map((img, i) => (
          <img key={i} src={img} alt="" className="w-full aspect-square rounded-lg object-cover" />
        ))}
      </div>
    </section>
  );
}

function BannerBlock({ data, slug }: { data: Record<string, unknown>; slug: string }) {
  const title = (data.title as string) || "이번 주 공구";
  const subtitle = (data.subtitle as string) || "";
  const imageUrl = data.image_url as string | undefined;
  const linkUrl = (data.link_url as string) || "#";
  const dday = data.dday as number | undefined;

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <a href={addUtm(linkUrl, slug)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-[#C41E1E] to-[#8B1515] hover:shadow-lg transition-shadow">
        <div className="flex items-center p-5">
          <div className="flex-1">
            {dday !== undefined && (
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white mb-2">
                D-{dday}
              </span>
            )}
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
            <span className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#C41E1E]">
              자세히 보기
            </span>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="ml-4 h-24 w-24 rounded-xl object-cover" />
          )}
        </div>
      </a>
    </section>
  );
}

function LinksBlock({ data, slug }: { data: Record<string, unknown>; slug: string }) {
  const items = (data.items as LinkBlock[]) || [];
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🔗</span>
        <h2 className="text-base font-bold text-gray-900">링크</h2>
      </div>
      <div className="space-y-2">
        {items.map((link) => (
          <a key={link.id} href={addUtm(link.url, slug)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-gray-300 hover:shadow-sm transition-all">
            <span className="text-xl">{link.icon}</span>
            <span className="flex-1 text-sm font-medium text-gray-900">{link.label}</span>
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </section>
  );
}

function VideoBlock({ data }: { data: Record<string, unknown> }) {
  const youtubeUrl = (data.youtube_url as string) || "";
  // 유튜브 URL → embed ID 추출
  let videoId = "";
  const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (match) videoId = match[1];

  if (!videoId) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function DividerBlock() {
  return (
    <div className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <hr className="border-gray-200" />
    </div>
  );
}

function ReviewsBlock({ reviews }: { reviews: ShopReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">💬</span>
        <h2 className="text-base font-bold text-gray-900">큐레이션 리뷰</h2>
        <span className="ml-auto text-xs text-gray-400">
          ★ {(reviews.reduce((a, r) => a + (r.product_rating || 0), 0) / reviews.length).toFixed(1)}
        </span>
      </div>
      <div className="space-y-2">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{review.customer_hash || "익명"}</span>
              <span className="text-xs text-yellow-500">{"★".repeat(review.product_rating || 0)}</span>
              {review.would_rebuy && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">재구매 의사</span>
              )}
              <span className="ml-auto text-xs text-gray-400">{review.created_at?.split("T")[0]}</span>
            </div>
            {review.product_comment && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{review.product_comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm font-bold text-gray-900">뉴스레터 구독</p>
        <p className="mt-1 text-xs text-gray-500">새 소식과 추천 상품을 가장 먼저 받아보세요</p>
        {done ? (
          <p className="mt-3 text-sm text-green-600 font-medium">구독 완료!</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#C41E1E]" />
            <button onClick={() => setDone(true)} className="cursor-pointer rounded-lg bg-[#C41E1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#A01818]">구독</button>
          </div>
        )}
      </div>
    </section>
  );
}

function HtmlBlock({ data }: { data: Record<string, unknown> }) {
  const html = (data.html as string) || "";
  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div dangerouslySetInnerHTML={{ __html: html }} className="prose prose-sm max-w-none" />
    </section>
  );
}

// ─── PICK 그리드 ───
function PicksBlock({ picks, slug }: { picks: DisplayPick[]; slug: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<DisplayPick | null>(null);

  const categories = [...new Set(picks.map((p) => p.category).filter(Boolean))];
  const filtered = selectedCategory ? picks.filter((p) => p.category === selectedCategory) : picks;

  const IMG_PLACEHOLDER = (
    <svg className="h-12 w-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <section className="mx-auto max-w-2xl px-3 sm:px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📦</span>
        <h2 className="text-base font-bold text-gray-900">PICK 컬렉션</h2>
        <span className="ml-auto text-xs text-gray-400">{picks.length}개</span>
      </div>

      {categories.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCategory(null)} className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${selectedCategory === null ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>전체</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${selectedCategory === cat ? "bg-[#111111] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{cat}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {filtered.map((pick) => {
          const badge = sourceBadge(pick.source);
          return (
            <div key={pick.id} onClick={() => setDetail(pick)} className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
              <div className="relative aspect-square bg-gray-100">
                {pick.image ? <img src={pick.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center">{IMG_PLACEHOLDER}</div>}
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.style}`}>{badge.label}</span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-gray-900 leading-snug min-h-[2.5rem]">{pick.name}</p>
                <p className="mt-1.5 text-base font-bold text-[#C41E1E]">{formatPrice(pick.price)}</p>
                <div className="mt-2 flex items-center justify-center rounded-lg bg-[#C41E1E] py-2 text-sm font-medium text-white group-hover:bg-[#A01818] transition-colors">상세보기</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 상품 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 aspect-[4/3] sm:aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
              {detail.image ? <img src={detail.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center">{IMG_PLACEHOLDER}</div>}
            </div>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sourceBadge(detail.source).style}`}>{sourceBadge(detail.source).label}</span>
            <h3 className="mt-2 text-base font-semibold text-gray-900 leading-snug">{detail.name}</h3>
            <p className="mt-2 text-xl font-bold text-[#C41E1E]">{formatPrice(detail.price)}</p>
            {detail.category && <p className="mt-1 text-xs text-gray-400">카테고리: {detail.category}</p>}
            {detail.curationComment && <p className="mt-2 text-sm text-gray-600 italic">&ldquo;{detail.curationComment}&rdquo;</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDetail(null)} className="flex-1 cursor-pointer rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">닫기</button>
              <a href={addUtm(detail.buyUrl, slug)} target="_blank" rel="noopener noreferrer" className="flex-[2] flex items-center justify-center rounded-xl bg-[#C41E1E] py-3 text-sm font-medium text-white hover:bg-[#A01818]">구매하러 가기</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 블록 디스패처 ───
function BlockRenderer({ block, creator, shop, picks, reviews, slug }: {
  block: ShopBlock;
  creator: ShopApiResponse["creator"];
  shop: ShopApiResponse["shop"];
  picks: DisplayPick[];
  reviews: ShopReview[];
  slug: string;
}) {
  switch (block.type) {
    case "hero": return <HeroBlock data={block.data} creator={creator} shop={shop} />;
    case "text": return <TextBlock data={block.data} />;
    case "image": return <ImageBlock data={block.data} />;
    case "gallery": return <GalleryBlock data={block.data} />;
    case "banner": return <BannerBlock data={block.data} slug={slug} />;
    case "links": return <LinksBlock data={block.data} slug={slug} />;
    case "picks": return <PicksBlock picks={picks} slug={slug} />;
    case "video": return <VideoBlock data={block.data} />;
    case "divider": return <DividerBlock />;
    case "reviews": return <ReviewsBlock reviews={reviews} />;
    case "newsletter": return <NewsletterBlock />;
    case "html": return <HtmlBlock data={block.data} />;
    default: return null;
  }
}

// ─── 기본 블록 레이아웃 (blocks 미설정 시 폴백) ───
function defaultBlocks(shop: ShopApiResponse["shop"]): ShopBlock[] {
  const blocks: ShopBlock[] = [
    { type: "hero", data: {} },
  ];
  if (shop?.link_blocks && shop.link_blocks.length > 0) {
    blocks.push({ type: "links", data: { items: shop.link_blocks } });
  }
  blocks.push({ type: "picks", data: {} });
  blocks.push({ type: "reviews", data: {} });
  return blocks;
}

// ─── 메인 ───
export default function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<ShopApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { params.then((p) => setSlug(p.slug)); }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/shop?slug=${slug}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then((d) => { setData(d); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading || !slug) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#C41E1E]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <h1 className="text-6xl font-extrabold text-gray-200">404</h1>
        <p className="mt-4 text-gray-500">존재하지 않는 쇼핑몰입니다</p>
        <a href="/" className="mt-6 text-sm text-[#C41E1E] hover:underline">홈으로</a>
      </div>
    );
  }

  const { creator, shop, picks, reviews } = data;

  // PICK 데이터 변환
  const displayPicks: DisplayPick[] = picks.length > 0
    ? picks.map((p) => ({
        id: p.id,
        name: (p.source_meta?.name as string) || p.product_name || "상품",
        price: (p.source_meta?.price as number) || p.price || 0,
        image: (p.source_meta?.image as string) || p.image || null,
        source: p.source_type,
        category: (p.source_meta?.category as string) || p.category || "",
        buyUrl: p.external_url || "#",
        curationComment: p.curation_comment || undefined,
      }))
    : FALLBACK_PICKS;

  // 블록 결정: DB에 blocks가 있으면 사용, 없으면 기본 레이아웃
  const blocks: ShopBlock[] = (shop?.blocks && Array.isArray(shop.blocks) && shop.blocks.length > 0)
    ? shop.blocks
    : defaultBlocks(shop);

  return (
    <div className="min-h-screen bg-gray-50">
      {blocks.map((block, idx) => (
        <BlockRenderer
          key={idx}
          block={block}
          creator={creator}
          shop={shop}
          picks={displayPicks}
          reviews={reviews}
          slug={slug}
        />
      ))}

      <footer className="border-t border-gray-100 bg-white py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold">
            <span className="text-[#C41E1E]">Tube</span>
            <span className="text-[#111111]">Ping</span>
          </span>
        </p>
      </footer>
    </div>
  );
}
