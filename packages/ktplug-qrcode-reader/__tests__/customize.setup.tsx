// tests/testSetup.ts
import { vi } from "vitest";

export const mockEventsOn = vi.fn();
export const mockGetSpaceElement = vi.fn();
export const mockGetHeaderSpaceElement = vi.fn();

// 共有するモック
globalThis.kintone = {
  events: {
    on: mockEventsOn,
  } as unknown as typeof kintone.events,
  app: {
    record: {
      getSpaceElement: mockGetSpaceElement,
    } as unknown as typeof kintone.app.record,
    getHeaderSpaceElement: mockGetHeaderSpaceElement,
  } as unknown as typeof kintone.app,
} as unknown as typeof kintone;

// プラグインの設定をモック
export const mockRestorePluginConfig = vi.fn();
vi.doMock("@ogrtk/shared-components", async () => {
  const actual = await vi.importActual<
    typeof import("@ogrtk/shared-components")
  >("@ogrtk/shared-components");
  return {
    ...actual,
    restorePluginConfig: mockRestorePluginConfig,
  };
});

// React の `createRoot` をモック
export const mockRender = vi.fn();
export const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));
vi.doMock("react-dom/client", () => ({
  createRoot: mockCreateRoot,
}));
