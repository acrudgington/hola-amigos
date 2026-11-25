import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Allow importing ../shared/catalog.json (single source of truth for services & prices).
  turbopack: { root: path.join(__dirname, "..") },
  outputFileTracingRoot: path.join(__dirname, ".."),
};
export default nextConfig;
