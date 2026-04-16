/**
 * CS 티켓 답변 API
 * POST /api/cs/reply — 답변 등록 + 카페24 댓글 동기화
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getActiveStores, cafe24Fetch } from "@/lib/cafe24";

export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const { ticket_id, reply } = await req.json();

  if (!ticket_id || !reply) {
    return NextResponse.json({ error: "ticket_id와 reply 필요" }, { status: 400 });
  }

  // 티켓 조회
  const { data: ticket, error: ticketError } = await sb
    .from("cs_tickets")
    .select("*")
    .eq("id", ticket_id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "티켓을 찾을 수 없습니다" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // 1. DB에 답변 저장
  await sb
    .from("cs_tickets")
    .update({
      reply,
      replied_at: now,
      replied_by: "관리자",
      status: "replied",
    })
    .eq("id", ticket_id);

  // 2. 대화 이력에 추가
  await sb.from("cs_ticket_messages").insert({
    ticket_id,
    direction: "outbound",
    sender_name: "관리자",
    content: reply,
    channel: ticket.channel,
  });

  // 3. 카페24 게시판이면 댓글로도 동기화
  let cafe24Synced = false;
  if (ticket.channel === "cafe24" && ticket.channel_ticket_id && ticket.channel_board_no && ticket.store_id) {
    try {
      const stores = await getActiveStores();
      const store = stores.find((s) => s.id === ticket.store_id);
      if (store) {
        const res = await cafe24Fetch(
          store,
          `/boards/${ticket.channel_board_no}/articles/${ticket.channel_ticket_id}/comments`,
          {
            method: "POST",
            body: JSON.stringify({
              request: {
                content: reply,
                writer: "관리자",
              },
            }),
          }
        );
        cafe24Synced = res.ok;
      }
    } catch {
      // 카페24 동기화 실패해도 DB 답변은 유지
    }
  }

  return NextResponse.json({ success: true, cafe24_synced: cafe24Synced });
}
