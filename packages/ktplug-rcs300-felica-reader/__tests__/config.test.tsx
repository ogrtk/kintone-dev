import { ErrorFallback } from "@/src/ErrorFallback";
import { App } from "@/src/components/config/App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";

// getElementById をモック化
globalThis.document.getElementById = vi.fn();

// `kintone` API をモック化
globalThis.kintone = {
  $PLUGIN_ID: "test_plugin",
  app: { getId: vi.fn().mockReturnValue("123") },
} as unknown as typeof kintone;

// window の モック
const mockAlertFn = vi.fn();
vi.stubGlobal("alert", mockAlertFn);

// React の `createRoot` をモック
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("plugin設定画面", () => {
  test("正常に描画", async () => {
    /* arrange */
    const rootEl = document.createElement("div");
    (globalThis.document.getElementById as Mock).mockReturnValue(rootEl);

    /* action */
    await import(`@/src/config?timestamp=${Date.now()}`);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledOnce();
    expect(createRoot as Mock).toHaveBeenCalledWith(rootEl);
    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalled();

    // render に渡された引数を検証
    expect(rootResult.render).toHaveBeenCalledTimes(1);
    const renderedTree = rootResult.render.mock.calls[0][0];

    // renderedTree は React 要素ツリーになっているので、階層構造を検証します。
    // まず、ルートは ErrorBoundary であること
    expect(renderedTree.type).toBe(ErrorBoundary);
    expect(renderedTree.props.FallbackComponent).toBe(ErrorFallback);

    // ErrorBoundary の子要素として QueryClientProvider がある
    const queryProvider = renderedTree.props.children;
    expect(queryProvider.type).toBe(QueryClientProvider);
    expect(queryProvider.props.client).toBeInstanceOf(QueryClient);

    // QueryClientProvider の子要素は Suspense
    const suspense = queryProvider.props.children;
    expect(suspense.type).toBe(Suspense);
    expect(suspense.props.fallback).toEqual(<div>Loading...</div>);

    // Suspense の子要素は App コンポーネントで、PLUGIN_ID が渡されていること
    const appComponent = suspense.props.children;
    expect(appComponent.type).toBe(App);
    expect(appComponent.props.PLUGIN_ID).toBe("test_plugin");
  });

  test("エラー(root用の要素無し)", async () => {
    /* arrange */
    (globalThis.document.getElementById as Mock).mockReturnValue(undefined);

    /* action */
    import(`@/src/config?timestamp=${Date.now()}`);

    /* assert */
    await waitFor(async () => {
      await expect(mockAlertFn).toHaveBeenCalledWith(
        "内部エラー：plugin-container要素がありません",
      );
      expect(createRoot as Mock).not.toHaveBeenCalledOnce();
    });
  });
});
