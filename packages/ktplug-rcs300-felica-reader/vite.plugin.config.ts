import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
/**
 * kintoneプラグイン設定画面用　ビルド設定
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    sourcemap: true,
    // ビルド時、カスタマイズのビルド→プラグイン設定画面のビルドの順で実施する
    // カスタマイズのビルド成果物を削除しないためにfalseとする
    emptyOutDir: false,
    rollupOptions: {
      input: { config: "src/config.tsx" },
      output: {
        // 即時実行関数
        format: "iife",
        // 開発サーバで扱えるよう、publicディレクトリの下にビルド後のファイルを生成
        dir: "public",
        entryFileNames: "[name].js",
      },
    },
  },
});
