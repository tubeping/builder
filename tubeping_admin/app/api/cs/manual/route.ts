/**
 * CS 수동 등록 API — 전화/문자/카카오톡/네이버톡 등 수동 입력
 * POST /api/cs/manual
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const sb = getServiceClient();
  const body = await req.json();

  const {
    channel = "phone",
    subject,
    content,
    customer_name,
    customer_phone,
    customer_email,
    order_id,
    product_name,
    ticket_type = "inquiry",
    priority = "normal",
    store_id,
  } = body;

  if (!subject) {
    return NextResponse.json({ error: "제목(subject) 필요" }, { status: 400 });
  }

  const channelTicketId = `manual_${Date.now()}`;

  const { data, error } = await sb
    .from("cs_tickets")
    .insert({
      store_id: store_id || null,
      channel,
      channel_ticket_id: channelTicketId,
      ticket_type,
      customer_name,
      customer_phone,
      customer_email,
      order_id,
      product_name,
      subject,
      content,
      priority,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 대화 이력에도 추가
  if (content) {
    await sb.from("cs_ticket_messages").insert({
      ticket_id: data.id,
      direction: "inbound",
      sender_name: customer_name || "고객",
      content,
      channel,
    });
  }

  return NextResponse.json({ success: true, ticket: data });
}
