import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

interface VideoMeta {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration?: string;
}

interface ChannelMeta {
  id: string;
  handle?: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  description?: string;
}

interface PersonaPayload {
  channel: ChannelMeta;
  latestVideos: VideoMeta[];
  topVideos: VideoMeta[];
  extractedAt: string;
  source: "youtube" | "dummy";
}

function extractHandle(url: string): { handle?: string; channelId?: string } {
  const channelMatch = url.match(/youtube\.com\/channel\/([\w-]+)/);
  if (channelMatch) return { channelId: channelMatch[1] };

  const handleMatch = url.match(/@([\w.-]+)/);
  if (handleMatch) return { handle: handleMatch[1] };

  if (/^UC[\w-]{20,}$/.test(url)) return { channelId: url };
  if (/^[\w.-]+$/.test(url)) return { handle: url };

  return {};
}

async function ytFetch<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function resolveChannelId(apiKey: string, opts: { handle?: string; channelId?: string }): Promise<string | null> {
  if (opts.channelId) return opts.channelId;
  if (!opts.handle) return null;

  // forHandle 직접 조회 (YouTube Data API v3 신규)
  const direct = await ytFetch<{ items?: Array<{ id: string }> }>(
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${encodeURIComponent(opts.handle)}&key=${apiKey}`
  ).catch(() => null);
  if (direct?.items?.[0]?.id) return direct.items[0].id;

  // 폴백: 검색
  const search = await ytFetch<{ items?: Array<{ snippet?: { channelId: string } }> }>(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(opts.handle)}&maxResults=1&key=${apiKey}`
  ).catch(() => null);
  return search?.items?.[0]?.snippet?.channelId ?? null;
}

async function fetchChannelMeta(apiKey: string, channelId: string): Promise<{ meta: ChannelMeta; uploadsPlaylistId: string } | null> {
  const data = await ytFetch<{
    items?: Array<{
      id: string;
      snippet: { title: string; description: string; publishedAt: string; thumbnails: { medium?: { url: string }; default?: { url: string } }; customUrl?: string };
      statistics: { subscriberCount: string; videoCount: string; viewCount: string };
      contentDetails: { relatedPlaylists: { uploads: string } };
    }>;
  }>(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`
  );

  const ch = data.items?.[0];
  if (!ch) return null;

  return {
    meta: {
      id: ch.id,
      handle: ch.snippet.customUrl?.replace(/^@/, ""),
      title: ch.snippet.title,
      thumbnail: ch.snippet.thumbnails.medium?.url ?? ch.snippet.thumbnails.default?.url ?? "",
      subscriberCount: parseInt(ch.statistics.subscriberCount, 10) || 0,
      videoCount: parseInt(ch.statistics.videoCount, 10) || 0,
      viewCount: parseInt(ch.statistics.viewCount, 10) || 0,
      publishedAt: ch.snippet.publishedAt,
      description: ch.snippet.description,
    },
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  };
}

async function fetchLatestVideoIds(apiKey: string, uploadsPlaylistId: string, limit = 50): Promise<string[]> {
  const data = await ytFetch<{
    items?: Array<{ contentDetails: { videoId: string } }>;
  }>(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${Math.min(limit, 50)}&key=${apiKey}`
  );
  return (data.items ?? []).map(i => i.contentDetails.videoId);
}

async function fetchVideoStats(apiKey: string, videoIds: string[]): Promise<VideoMeta[]> {
  if (videoIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) chunks.push(videoIds.slice(i, i + 50));

  const all: VideoMeta[] = [];
  for (const chunk of chunks) {
    const data = await ytFetch<{
      items?: Array<{
        id: string;
        snippet: { title: string; publishedAt: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
        contentDetails: { duration: string };
      }>;
    }>(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(",")}&key=${apiKey}`
    );
    for (const v of data.items ?? []) {
      all.push({
        id: v.id,
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails.medium?.url ?? v.snippet.thumbnails.default?.url ?? "",
        publishedAt: v.snippet.publishedAt,
        viewCount: parseInt(v.statistics.viewCount ?? "0", 10),
        likeCount: parseInt(v.statistics.likeCount ?? "0", 10),
        commentCount: parseInt(v.statistics.commentCount ?? "0", 10),
        duration: v.contentDetails.duration,
      });
    }
  }
  return all;
}

function dummyPayload(handle: string): PersonaPayload {
  const now = new Date().toISOString();
  const mkVideo = (i: number, views: number): VideoMeta => ({
    id: `dummy-${i}`,
    title: `(샘플) ${handle} 영상 ${i}`,
    thumbnail: `https://via.placeholder.com/320x180/EEE/333?text=Video+${i}`,
    publishedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    viewCount: views,
    likeCount: Math.floor(views * 0.04),
    commentCount: Math.floor(views * 0.005),
  });
  const latest = Array.from({ length: 10 }, (_, i) => mkVideo(i + 1, 12000 - i * 800));
  const top = Array.from({ length: 10 }, (_, i) => mkVideo(100 + i, 150000 - i * 8000));
  return {
    channel: {
      id: `dummy-${handle}`,
      handle,
      title: handle,
      thumbnail: `https://via.placeholder.com/88/FF0050/ffffff?text=YT`,
      subscriberCount: 125000,
      videoCount: 230,
      viewCount: 15800000,
      publishedAt: "2020-03-15T00:00:00Z",
      description: "(샘플 데이터) YOUTUBE_API_KEY를 설정하면 실제 데이터로 채워집니다.",
    },
    latestVideos: latest,
    topVideos: top,
    extractedAt: now,
    source: "dummy",
  };
}

const SUPPORTED_PLATFORMS = ["youtube", "instagram", "tiktok", "blog", "etc"] as const;
type Platform = typeof SUPPORTED_PLATFORMS[number];

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as { channelUrl?: string; platform?: string }));
  const channelUrl = (body.channelUrl ?? "").trim();
  const rawPlatform = (body.platform ?? "youtube").toLowerCase();
  const platform: Platform = (SUPPORTED_PLATFORMS as readonly string[]).includes(rawPlatform)
    ? (rawPlatform as Platform)
    : "youtube";

  if (!channelUrl) {
    return NextResponse.json({ error: "channelUrl 필요" }, { status: 400 });
  }

  // 메인 채널이 유튜브가 아니면 URL만 저장
  if (platform !== "youtube") {
    const { data: existing } = await supabase
      .from("creators")
      .select("persona")
      .eq("email", user.email)
      .single();

    // 유튜브에서 다른 플랫폼으로 바꾼 경우, 유튜브 추출 결과는 보존하되 메인은 새 플랫폼
    const merged = { ...(existing?.persona ?? {}) };

    await supabase
      .from("creators")
      .update({
        persona: merged,
        channel_url: channelUrl,
        platform,
      })
      .eq("email", user.email);

    return NextResponse.json({ ok: true, persona: merged, platform });
  }

  // 유튜브: 자동 추출
  const parsed = extractHandle(channelUrl);
  if (!parsed.handle && !parsed.channelId) {
    return NextResponse.json({ error: "유효한 채널 URL이 아닙니다" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  let payload: PersonaPayload;

  if (!apiKey) {
    payload = dummyPayload(parsed.handle ?? parsed.channelId ?? "channel");
  } else {
    try {
      const channelId = await resolveChannelId(apiKey, parsed);
      if (!channelId) {
        return NextResponse.json({ error: "채널을 찾을 수 없습니다" }, { status: 404 });
      }

      const chData = await fetchChannelMeta(apiKey, channelId);
      if (!chData) {
        return NextResponse.json({ error: "채널 정보 조회 실패" }, { status: 404 });
      }

      const videoIds = await fetchLatestVideoIds(apiKey, chData.uploadsPlaylistId, 50);
      const videos = await fetchVideoStats(apiKey, videoIds);

      const latestVideos = [...videos]
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 10);
      const topVideos = [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);

      payload = {
        channel: chData.meta,
        latestVideos,
        topVideos,
        extractedAt: new Date().toISOString(),
        source: "youtube",
      };
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "YouTube API 오류" },
        { status: 502 }
      );
    }
  }

  // creators.persona JSONB 업데이트 (기존 manualInput 등 보존)
  const { data: existing } = await supabase
    .from("creators")
    .select("persona, channel_url, subscriber_count")
    .eq("email", user.email)
    .single();

  const merged = {
    ...(existing?.persona ?? {}),
    channel: payload.channel,
    latestVideos: payload.latestVideos,
    topVideos: payload.topVideos,
    extractedAt: payload.extractedAt,
    source: payload.source,
  };

  await supabase
    .from("creators")
    .update({
      persona: merged,
      channel_url: channelUrl,
      platform: "youtube",
      subscriber_count: payload.channel.subscriberCount,
    })
    .eq("email", user.email);

  return NextResponse.json({ ok: true, persona: merged, platform: "youtube" });
}
