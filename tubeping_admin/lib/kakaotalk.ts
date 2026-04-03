/**
 * 카카오 챗봇 스킬 API 클라이언트
 * 문서: https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide
 *
 * 카카오 i 오픈빌더에서 스킬 서버로 웹훅 수신 → 응답
 * 비동기 응답은 callbackUrl로 POST
 */

// ─── 타입: 수신 (SkillPayload) ────────────────────

export interface KakaoSkillPayload {
  intent: {
    id: string;
    name: string;
  };
  userRequest: {
    timezone: string;
    block: { id: string; name: string };
    utterance: string; // 사용자 메시지
    lang: string;
    user: {
      id: string; // botUserKey
      type: string;
      properties: Record<string, string>;
    };
    callbackUrl?: string; // 비동기 응답용 (1분 유효, 1회용)
  };
  bot: {
    id: string;
    name: string;
  };
  action: {
    name: string;
    clientExtra: Record<string, unknown>;
    params: Record<string, string>;
    id: string;
    detailParams: Record<string, { origin: string; value: string; groupName?: string }>;
  };
}

// ─── 타입: 응답 (SkillResponse) ───────────────────

export interface KakaoSkillResponse {
  version: "2.0";
  useCallback?: boolean;
  template?: {
    outputs: KakaoOutput[];
    quickReplies?: Array<{
      messageText: string;
      action: "message" | "block";
      label: string;
      blockId?: string;
    }>;
  };
}

export type KakaoOutput =
  | { simpleText: { text: string } }
  | { simpleImage: { imageUrl: string; altText: string } };

// ─── 응답 빌더 ────────────────────────────────────

/**
 * 텍스트 즉시 응답 생성
 */
export function buildTextResponse(text: string): KakaoSkillResponse {
  return {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}

/**
 * 콜백 사용 응답 (5초 초과 처리 시)
 */
export function buildCallbackResponse(): KakaoSkillResponse {
  return {
    version: "2.0",
    useCallback: true,
  };
}

/**
 * 콜백 URL로 비동기 응답 전송
 */
export async function sendCallbackResponse(
  callbackUrl: string,
  text: string
): Promise<{ success: boolean; status: number }> {
  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTextResponse(text)),
  });
  return { success: res.ok, status: res.status };
}

/**
 * SkillPayload에서 사용자 메시지와 ID 추출
 */
export function extractFromPayload(payload: KakaoSkillPayload) {
  return {
    userId: payload.userRequest.user.id,
    message: payload.userRequest.utterance,
    callbackUrl: payload.userRequest.callbackUrl,
    botId: payload.bot.id,
    botName: payload.bot.name,
    blockName: payload.userRequest.block.name,
  };
}
