import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { UseEffectErrorAsyncChild } from "./sampleChild";

/** 同期処理でのエラー */
export function throwError() {
  throw new Error("throw error");
}

/** 非同期処理でのエラー */
export async function throwErrorAsync() {
  throw new Error("throw error asyncronously");
}

/** レンダリング時の同期処理でのエラー */
export function CompRenderError() {
  throwError();
  return <div>sample</div>;
}

/** レンダリング時の非同期処理でのエラー */
export function CompRenderErrorAsync() {
  throwErrorAsync();
  return <div>sample</div>;
}

/**
 * レンダリング時の同期処理エラーをErrorboundaryで捕捉(Suspense不要)
 * @returns
 */
export function AppRenderError() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <RenderError />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
export function RenderError() {
  throwError();
  return <div>sample</div>;
}

/**
 * レンダリング時の非同期処理エラーをErrorboundaryで捕捉（Suspenseを使用）
 * @returns
 */
export function AppRenderErrorAsync() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<h1>Loading...</h1>}>
          <RenderErrorAsync />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
export function RenderErrorAsync() {
  useSuspenseQuery({
    queryKey: ["throwingError"],
    queryFn: throwErrorAsync,
    retry: false, // これを追加
  });
  return <div>sample</div>;
}

/**
 * useEffectの同期処理でエラー
 * @returns
 */
export function UseEffectError() {
  useEffect(() => {
    throwError();
  }, []);
  return <div>sample</div>;
}

/**
 * useEffectの非同期処理でエラー
 * @returns
 */
export function UseEffectErrorAsync() {
  useEffect(() => {
    throwErrorAsync();
  }, []);
  return <div>sample</div>;
}

/**
 * useEffectの非同期処理でエラー(useEffect内でasyncのIIFE実行)
 * @returns
 */
export function UseEffectErrorAsyncWrapped() {
  useEffect(() => {
    (async () => {
      await throwErrorAsync();
    })();
  }, []);
  return <div>sample</div>;
}

export function UseEffectErrorAsyncParent() {
  const throwErrorAsync = async (str: string) => {
    throw new Error(str);
  };
  return <UseEffectErrorAsyncChild func={throwErrorAsync} />;
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert">
      <p>エラーが発生しました:</p>
      <pre>{error.message}</pre>
      <button type="button" onClick={resetErrorBoundary}>
        再試行
      </button>
    </div>
  );
}
