import crypto from "crypto";

/**
 * 쿠팡 파트너스 HMAC 서명 생성
 * message = datetime + method + path + query (? 구분자 없이)
 * datetime: yyMMdd'T'HHmmss'Z' (UTC)
 */
export function generateHmac(
  method: string,
  path: string,
  query: string,
  accessKey: string,
  secretKey: string
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datetime =
    String(now.getUTCFullYear()).slice(2) +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    "T" +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds()) +
    "Z";

  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}
