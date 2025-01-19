import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
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
