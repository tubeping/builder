import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyWebhookSignature } from "@/lib/meta/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta가 webhook URL 등록 시 검증용 요청을 보냄
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type IGCommentValue = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
};

type IGWebhookEntry = {
  id: string;
  time?: number;
  changes?: Array<{ field: string; value: IGCommentValue }>;
  messaging?: unknown[];
};

type IGWebhookBody = {
  object?: string;
  entry?: IGWebhookEntry[];
};

// 실제 이벤트 수신 (댓글, 메시지 등)
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: IGWebhookBody;
  try {
    body = JSON.parse(rawBody) as IGWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Meta 권장: 3초 이내 200 응답 → 처리는 비동기로
  // 큐에 넣고 즉시 응답
  enqueueEvents(body).catch((e) => {
    console.error("[meta.webhook] enqueue failed", e);
  });

  return new NextResponse("OK", { status: 200 });
}

async function enqueueEvents(body: IGWebhookBody): Promise<void> {
  if (body.object !== "instagram" || !body.entry) return;

  for (const entry of body.entry) {
    const igUserId = entry.id;

    // 연결된 크리에이터 찾기
    const { data: connection } = await supabaseAdmin
      .from("meta_connections")
      .select("creator_id, active")
      .eq("ig_user_id", igUserId)
      .eq("active", true)
      .maybeSingle();

    if (!connection) continue;

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;

      const v = change.value;
      const commentId = v.id;
      const commentText = (v.text ?? "").trim();
      const commenterUserId = v.from?.id;
      const commenterUsername = v.from?.username;
      const mediaId = v.media?.id;

      if (!commentId || !commentText) continue;

      // 본인 댓글은 스킵 (자기가 단 댓글에 자기가 DM 보내는 거 방지)
      if (commenterUserId === igUserId) continue;

      // 활성화된 룰 가져오기 (해당 크리에이터)
      const { data: rules } = await supabaseAdmin
        .from("dm_rules")
        .select("id, keywords, match_mode, reply_message, post_id, priority, per_user_cooldown_hours")
        .eq("creator_id", connection.creator_id)
        .eq("active", true)
        .order("priority", { ascending: false });

      if (!rules || rules.length === 0) continue;

      const lower = commentText.toLowerCase();
      const matched = rules.find((r) => {
        if (r.post_id && mediaId && r.post_id !== mediaId) return false;
        const mode = r.match_mode ?? "contains";
        return (r.keywords ?? []).some((kw: string) => {
          const k = kw.toLowerCase().trim();
          if (!k) return false;
          if (mode === "exact") return lower === k;
          if (mode === "starts_with") return lower.startsWith(k);
          return lower.includes(k);
        });
      });

      if (!matched) continue;

      // 쿨다운: 같은 사용자에게 N시간 내 동일 룰로 이미 보냈으면 스킵
      if (commenterUserId && matched.per_user_cooldown_hours > 0) {
        const cutoff = new Date(Date.now() - matched.per_user_cooldown_hours * 3600 * 1000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("dm_logs")
          .select("id")
          .eq("creator_id", connection.creator_id)
          .eq("rule_id", matched.id)
          .eq("recipient_ig_user_id", commenterUserId)
          .eq("status", "sent")
          .gte("sent_at", cutoff)
          .limit(1);
        if (recent && recent.length > 0) continue;
      }

      // 큐에 넣기 (comment_id 유니크 제약으로 중복 자동 차단)
      await supabaseAdmin.from("dm_jobs").upsert(
        {
          creator_id: connection.creator_id,
          rule_id: matched.id,
          comment_id: commentId,
          commenter_ig_user_id: commenterUserId,
          commenter_username: commenterUsername,
          comment_text: commentText,
          reply_message: matched.reply_message,
          status: "pending",
          next_attempt_at: new Date().toISOString(),
        },
        { onConflict: "comment_id", ignoreDuplicates: true }
      );
    }
  }
}
