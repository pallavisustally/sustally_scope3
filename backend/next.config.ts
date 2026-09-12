import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import path from "path";

const backendRoot = process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: backendRoot,
  turbopack: {
    root: backendRoot,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    webpackConfig.watchOptions = {
      ...(webpackConfig.watchOptions ?? {}),
      ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
    };
    return webpackConfig;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
