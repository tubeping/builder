/**
 * 일회성 스크립트 — Supabase Storage 'shop-assets' bucket 생성
 *
 * 실행:
 *   npx tsx scripts/create-shop-assets-bucket.ts
 *
 * 동작:
 *   1. bucket 존재 확인
 *   2. 없으면 public bucket 생성 (5MB · 이미지 mime)
 *   3. 이미 있으면 설정만 동기화 (verbose 출력)
 *
 * 안전:
 *   - 기존 bucket 데이터 변경 X (있으면 skip)
 *   - admin DB 테이블 영향 X
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// .env.local 수동 로드 (Next.js context 밖이라 process.env 비어있음)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) {
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 둘 다 필요");
  process.exit(1);
}

const BUCKET = "shop-assets";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`▸ ${SUPABASE_URL}`);
  console.log(`▸ bucket: ${BUCKET}\n`);

  // 1) 기존 bucket 조회
  const { data: list, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("❌ bucket list 실패:", listErr.message);
    process.exit(1);
  }

  const existing = list?.find((b) => b.name === BUCKET);
  if (existing) {
    console.log(`✓ 이미 존재: ${BUCKET}`);
    console.log(`  public:        ${existing.public}`);
    console.log(`  file_size_limit: ${existing.file_size_limit ?? "(unlimited)"}`);
    console.log(`  allowed_mime:    ${existing.allowed_mime_types?.join(", ") ?? "(any)"}`);
    if (!existing.public) {
      console.log("\n⚠ public 아님 — 업데이트 시도");
      const { error: updErr } = await supabase.storage.updateBucket(BUCKET, { public: true });
      if (updErr) console.error("❌ update 실패:", updErr.message);
      else console.log("✓ public 으로 변경 완료");
    }
    return;
  }

  // 2) 신규 생성
  console.log(`▸ 새 bucket 생성 중...`);
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ],
  });

  if (createErr) {
    console.error("❌ 생성 실패:", createErr.message);
    process.exit(1);
  }

  console.log(`✓ '${BUCKET}' bucket 생성 완료 (public · 5MB · jpg/png/webp/gif/avif)`);
  console.log("\n다음:");
  console.log("  대시보드 → 몰꾸미기 → 이미지 업로드 다시 시도");
}

main().catch((e) => {
  console.error("❌ 예외:", e);
  process.exit(1);
});
