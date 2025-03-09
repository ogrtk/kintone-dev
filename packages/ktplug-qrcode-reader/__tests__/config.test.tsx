import { App } from "@/src/components/config/App";
import { waitFor } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";

// getElementById をモック化
globalThis.document.getElementById = vi.fn();

// `kintone` API をモック化
globalThis.kintone = {
  $PLUGIN_ID: "test_plugin",
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
    expect(rootResult.render).toHaveBeenCalledWith(
      <App PLUGIN_ID="test_plugin" />,
    );
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
