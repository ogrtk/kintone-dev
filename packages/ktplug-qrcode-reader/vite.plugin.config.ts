import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
/**
 * kintoneプラグイン設定画面用　ビルド設定
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    sourcemap: true,
    emptyOutDir: false,
    rollupOptions: {
      input: { config: "src/config.tsx" }, // ビルドの起点
      output: {
        format: "iife", // 即時実行関数
        dir: "public", // 開発サーバで扱えるよう、publicディレクトリの下にビルド後のファイルを生成
        entryFileNames: "[name].js",
      },
    },
  },
});
