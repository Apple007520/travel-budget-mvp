import type { NextConfig } from "next";

/** 设为 `/仓库名` 用于 GitHub Pages 等项目子路径部署；留空则站点在域名根路径（如 Vercel） */
const basePath = process.env.NEXT_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
