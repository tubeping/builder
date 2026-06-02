// Meta Graph API client - fetch 직접 호출
// SDK 미사용 이유: 공식 SDK는 Marketing 중심, Instagram Messaging 누락 (2026-05 벤치마킹)

const GRAPH_BASE = "https://graph.instagram.com";
const FB_GRAPH_BASE = "https://graph.facebook.com";

function getVersion(): string {
  return process.env.META_GRAPH_VERSION ?? "v25.0";
}

type GraphError = { error: { message: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } };

class MetaApiError extends Error {
  constructor(public status: number, public payload: GraphError | unknown, message: string) {
    super(message);
    this.name = "MetaApiError";
  }
}

async function graphFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new MetaApiError(res.status, text, `Non-JSON response (${res.status})`);
  }
  if (!res.ok) {
    const err = json as GraphError;
    throw new MetaApiError(res.status, json, err?.error?.message ?? `Graph API ${res.status}`);
  }
  return json as T;
}

// ───────── OAuth ─────────

export type ShortLivedTokenResponse = {
  access_token: string;
  user_id: string;
  permissions: string[];
};

// authorization code → short-lived token (Instagram Business Login)
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  return graphFetch<ShortLivedTokenResponse>(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds (보통 ~5,184,000 = 60일)
};

// short-lived → long-lived (60일)
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const url = new URL(`${GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!);
  url.searchParams.set("access_token", shortLivedToken);
  return graphFetch<LongLivedTokenResponse>(url.toString());
}

// long-lived 갱신 (만료 7일 전 사용)
export async function refreshLongLivedToken(longLivedToken: string): Promise<LongLivedTokenResponse> {
  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);
  return graphFetch<LongLivedTokenResponse>(url.toString());
}

// ───────── Account info ─────────

export type IGUserMe = {
  id: string;
  user_id?: string;
  username: string;
  account_type?: string;
  name?: string;
  profile_picture_url?: string;
};

export async function getMe(accessToken: string): Promise<IGUserMe> {
  const url = new URL(`${GRAPH_BASE}/${getVersion()}/me`);
  url.searchParams.set("fields", "user_id,username,account_type,name,profile_picture_url");
  url.searchParams.set("access_token", accessToken);
  return graphFetch<IGUserMe>(url.toString());
}

// ───────── Webhook subscription ─────────

export async function subscribeWebhookFields(igUserId: string, accessToken: string, fields = "comments,messages"): Promise<{ success: boolean }> {
  const url = new URL(`${GRAPH_BASE}/${getVersion()}/${igUserId}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", fields);
  url.searchParams.set("access_token", accessToken);
  return graphFetch<{ success: boolean }>(url.toString(), { method: "POST" });
}

// ───────── DM 발송 ─────────

// 1) Private Reply (댓글 → DM, 7일 이내 1회만)
export async function sendPrivateReply(igUserId: string, commentId: string, message: string, accessToken: string): Promise<{ message_id: string; recipient_id: string }> {
  const url = `${GRAPH_BASE}/${getVersion()}/${igUserId}/messages`;
  return graphFetch<{ message_id: string; recipient_id: string }>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: message },
    }),
  });
}

// 2) 일반 DM (24시간 메시지 윈도우 내, 사용자가 먼저 메시지 보낸 경우)
export async function sendDirectMessage(igUserId: string, recipientId: string, message: string, accessToken: string, tag?: "HUMAN_AGENT"): Promise<{ message_id: string; recipient_id: string }> {
  const url = `${GRAPH_BASE}/${getVersion()}/${igUserId}/messages`;
  const body: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: { text: message },
  };
  if (tag) body.messaging_type = "MESSAGE_TAG", body.tag = tag;
  return graphFetch<{ message_id: string; recipient_id: string }>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

// ───────── Authorization URL builder ─────────

export function buildAuthorizationUrl(state: string): string {
  // Instagram Business Login (App Dashboard에서 등록한 redirect_uri와 정확히 일치해야 함)
  const url = new URL(`https://www.instagram.com/oauth/authorize`);
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("redirect_uri", process.env.META_OAUTH_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_content_publish",
  ].join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

export { MetaApiError };
export type { GraphError };
