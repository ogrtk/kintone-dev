import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./ErrorFallback";
import { App } from "./components/config/App";

/**
 * プラグイン設定画面のjavascriptエントリポイント
 */
(async (PLUGIN_ID) => {
  // プラグイン設定画面用のhtml中の要素を取得し、Reactコンポーネントを配置
  const rootEl = document.getElementById("plugin-container");
  if (!rootEl) {
    alert("内部エラー：plugin-container要素がありません");
    return;
  }
  const queryClient = new QueryClient();

  const root = createRoot(rootEl);
  root.render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <App PLUGIN_ID={PLUGIN_ID} />
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>,
  );
})(kintone.$PLUGIN_ID);
