import path from "node:path";
import { defineConfig } from "vite";
import baseConfig from "../../vite.config";

// Viteの設定
export default defineConfig({
  ...baseConfig,

  server: {
    https: baseConfig?.server?.https,
    // open: path.join("src", "index.js"),
  },
});
