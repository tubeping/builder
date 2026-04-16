import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const NOTIFY_TO = "choi.jun@shinsananalytics.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, channel, subscribers, email } = body;

    if (!type || !channel || !subscribers || !email) {
      return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }

    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #C41E1E; color: white; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚀 새로운 입점 신청</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">TubePing 인플루언서 입점 신청이 접수되었습니다.</p>
        </div>
        <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 120px;">인플루언서 유형</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${type}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">채널명</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${channel}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">구독자 수</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${subscribers}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #374151;">이메일</td>
              <td style="padding: 12px 0; color: #111827;"><a href="mailto:${email}" style="color: #C41E1E;">${email}</a></td>
            </tr>
          </table>
        </div>
      </div>
    `;

    if (SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"TubePing 입점신청" <${SMTP_USER}>`,
        to: NOTIFY_TO,
        subject: `[입점신청] ${channel} (${type} / ${subscribers})`,
        html,
      });
    } else {
      console.log(`[입점신청 시뮬레이션] ${type} | ${channel} | ${subscribers} | ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[입점신청 에러]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
