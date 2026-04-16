import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  typescript: {
    // tubeping_admin이 상위에 있어서 빌드 시 간섭 — 타입체크는 별도로 수행
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
