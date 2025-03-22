import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./ErrorFallback";
import { App } from "./components/config/App";

(async (PLUGIN_ID) => {
  const rootEl = document.getElementById("plugin-container");
  if (!rootEl) {
    alert("内部エラー：plugin-container要素がありません");
    return;
  }
  const root = createRoot(rootEl);

  const queryClient = new QueryClient();

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
