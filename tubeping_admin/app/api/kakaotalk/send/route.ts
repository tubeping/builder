/**
 * 카카오톡 답변 발송 API
 * POST /api/kakaotalk/send
 * body: { ticket_id, message }
 *
 * 최근 메시지의 callbackUrl이 있으면 콜백으로 발송
 * 없으면 DB에만 저장 (카카오는 push 불가, 고객이 다시 말 걸어야 함)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendCallbackResponse } from "@/lib/kakaotalk";

export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const { ticket_id, message } = await req.json();

  if (!ticket_id || !message) {
    return NextResponse.json({ error: "ticket_id와 message 필요" }, { status: 400 });
  }

  // 티켓 조회
  const { data: ticket, error: ticketErr } = await sb
    .from("cs_tickets")
    .select("*")
    .eq("id", ticket_id)
    .single();

  if (ticketErr || !ticket) {
    return NextResponse.json({ error: "티켓을 찾을 수 없습니다" }, { status: 404 });
  }

  if (ticket.channel !== "kakao") {
    return NextResponse.json({ error: "카카오톡 티켓이 아닙니다" }, { status: 400 });
  }

  // 최근 메시지에서 callbackUrl 찾기
  const { data: lastMsg } = await sb
    .from("cs_ticket_messages")
    .select("channel_message_id")
    .eq("ticket_id", ticket_id)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let kakaoSent = false;
  const callbackUrl = lastMsg?.channel_message_id;

  if (callbackUrl && callbackUrl.startsWith("http")) {
    // 콜백 URL로 발송 시도 (1분 유효이므로 실패할 수 있음)
    const result = await sendCallbackResponse(callbackUrl, message);
    kakaoSent = result.success;
  }

  // DB 업데이트
  const now = new Date().toISOString();
  await sb
    .from("cs_tickets")
    .update({ reply: message, replied_at: now, replied_by: "관리자", status: "replied" })
    .eq("id", ticket_id);

  await sb.from("cs_ticket_messages").insert({
    ticket_id,
    direction: "outbound",
    sender_name: "관리자",
    content: message,
    channel: "kakao",
  });

  return NextResponse.json({
    success: true,
    kakao_sent: kakaoSent,
    note: kakaoSent
      ? "카카오톡으로 발송 완료"
      : "콜백 만료 — 고객이 다시 메시지를 보내면 자동 응답됩니다. DB에는 저장되었습니다.",
  });
}
