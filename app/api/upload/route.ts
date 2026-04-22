/**
 * 이미지 업로드 — Supabase Storage (bucket: shop-assets)
 *
 * 크리에이터가 몰 꾸미기에서 커버/프로필/배너/상품 이미지를 올릴 때 사용.
 * URL 붙여넣기 대신 파일을 바로 삽입할 수 있게 해줌.
 *
 * 요구:
 *   Supabase Storage에 'shop-assets' bucket이 미리 생성되어 있어야 함 (public read).
 *   없으면 Supabase 대시보드 → Storage → New bucket → name: shop-assets, public: true.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const MAX_SIZE = 5 * 1024 * 1024;  // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const BUCKET = "shop-assets";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data 형식이 아닙니다" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file 필드 필요" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `파일 크기 5MB 초과 (${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: `지원하지 않는 형식: ${file.type}. jpg/png/webp/gif/avif만 가능` }, { status: 400 });
  }

  // 저장 경로: {user_id}/{timestamp}-{random}.{ext}
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
  const path = `${user.id}/${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (uploadErr) {
    // bucket 없는 경우 친절한 메시지
    const msg = uploadErr.message || "";
    if (/not found|does not exist|Bucket/i.test(msg)) {
      return NextResponse.json(
        { error: `Storage bucket '${BUCKET}' 없음. Supabase 대시보드에서 public bucket으로 생성해주세요.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: `업로드 실패: ${msg}` }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    url: pub.publicUrl,
    path,
    size: file.size,
    type: file.type,
  });
}
