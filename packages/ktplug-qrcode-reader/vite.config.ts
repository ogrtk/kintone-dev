import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import baseConfig from "../../vite.config";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * kintoneカスタマイズ用　ビルド設定
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: { customize: path.resolve(__dirname, "src", "customize.tsx") },
      output: {
        // 即時実行関数
        format: "iife",
        // 開発サーバで扱えるよう、publicディレクトリの下にビルド後のファイルを生成
        dir: "public",
        entryFileNames: "[name].js",
      },
    },
  },
  server: {
    https: baseConfig.server?.https,
    open: path.join("public", "customize.js"),
    // publicディレクトリを監視対象に（更新時に開発サーバで読み込み直す）
    watch: {
      ignored: ["!**/public/**"],
    },
  },
});
