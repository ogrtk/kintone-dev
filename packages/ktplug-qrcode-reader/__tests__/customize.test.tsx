import { AppIndex, AppRecord } from "@/src/components/customize/App";
import type { PluginConfig } from "@/src/types";
import { restorePluginConfig } from "@ogrtk/shared-components";
import { createRoot } from "react-dom/client";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";

// `kintone` API をモック化
globalThis.kintone = {
  events: {
    on: vi.fn(),
  } as unknown as typeof kintone.events,
  app: {
    record: {
      getSpaceElement: vi.fn(),
    } as unknown as typeof kintone.app.record,
    getHeaderSpaceElement: vi.fn(),
  } as unknown as typeof kintone.app,
  $PLUGIN_ID: "test_plugin",
} as unknown as typeof kintone;

// kintone api 利用コードをモック化後に読み込み
await import("@/src/customize");

// プラグインの設定をモック
vi.mock("@ogrtk/shared-components", async () => {
  const actual = await vi.importActual<
    typeof import("@ogrtk/shared-components")
  >("@ogrtk/shared-components");
  return {
    ...actual,
    restorePluginConfig: vi.fn(),
  };
});

// React の `createRoot` をモック
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

beforeEach(() => {
  // await import("@/src/customize");で実行された
  // globalThis.kintone.events.on の呼出履歴が消去されてしまうため、
  // vi.clearAllMocks();は使わずに、個別にmockClearする
  (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockClear();
  (globalThis.kintone.app.record.getSpaceElement as Mock).mockClear();
  (createRoot as Mock).mockClear();
  (restorePluginConfig as Mock).mockClear();
});

describe("編集画面・追加画面のカスタマイズ処理", () => {
  test.each(["app.record.edit.show", "app.record.create.show"])(
    "指定したスペース位置にAppRecordコンポーネントが設置される(イベント:%s)",
    (eventName) => {
      /* arrange */
      const mockConfig: PluginConfig = {
        useCase: {
          types: ["record"],
          record: { space: "reader" },
        },
        qrCode: { dataName: "コード", field: "code" },
      };
      (restorePluginConfig as Mock).mockReturnValue(mockConfig);
      const mockElement = document.createElement("div");
      (globalThis.kintone.app.record.getSpaceElement as Mock).mockReturnValue(
        mockElement,
      );

      /* action */
      const eventHandler = getHandler(
        globalThis.kintone.events.on as Mock,
        eventName,
      );
      const event = {}; // ダミーイベント
      eventHandler(event);

      /* assert */
      expect(
        globalThis.kintone.app.record.getSpaceElement as Mock,
      ).toHaveBeenCalledWith("reader");
      expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);
      const rootResult = (createRoot as Mock).mock.results[0].value;
      expect(rootResult.render).toHaveBeenCalledWith(
        <AppRecord config={mockConfig} />,
      );
    },
  );

  test("recordのconfig設定が無い場合は中断", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["listRegist"],
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    // スペースが存在しないものとする
    (globalThis.kintone.app.record.getSpaceElement as Mock).mockReturnValue(
      null,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.edit.show",
    );
    const event = {}; // ダミーイベント
    eventHandler(event);

    /* assert */
    expect(
      globalThis.kintone.app.record.getSpaceElement as Mock,
    ).not.toHaveBeenCalled();
  });

  test("QRコードリーダーの設置スペースが存在しない場合はエラー", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["record"],
        record: { space: "reader" },
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    // スペースが存在しないものとする
    (globalThis.kintone.app.record.getSpaceElement as Mock).mockReturnValue(
      null,
    );

    /* action & assert */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.edit.show",
    );
    expect(() => eventHandler({})).toThrow(
      "QRコードリーダー設置用の項目がありません:reader",
    );
  });
});

describe("index画面のカスタマイズ処理", () => {
  test("設定した一覧ビューにQRコードリーダーが設置される(regist)", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "登録画面",
          useAdditionalValues: true,
          additionalValues: [],
          noDuplicate: true,
        },
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "登録画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);

    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalledWith(
      <AppIndex config={mockConfig} mode="regist" />,
    );
  });

  test("設定した一覧ビューにQRコードリーダーが設置される(update)", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "更新画面",
          updateValues: [{ field: "field", value: "value" }],
        },
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "更新画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);
    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalledWith(
      <AppIndex config={mockConfig} mode="update" />,
    );
  });

  test("設定した一覧ビューにQRコードリーダーが設置される(search)", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["listSearch"],
        listSearch: {
          targetViewName: "検索画面",
        },
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "検索画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);
    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalledWith(
      <AppIndex config={mockConfig} mode="search" />,
    );
  });

  test("一覧用のconfig設定が無い場合は中断", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["record"],
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "record" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).not.toHaveBeenCalled();
  });

  test("QRコードリーダーの設置スペースが存在しない場合はエラー", () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      useCase: {
        types: ["listSearch"],
        listSearch: {
          targetViewName: "検索画面",
        },
      },
      qrCode: { dataName: "コード", field: "code" },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      null,
    );

    /* action & assert */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "検索画面" }; // モックの一覧ビューイベント
    expect(() => eventHandler(event)).toThrow(
      "QRコードリーダー設置用のヘッダスペースが取得できません",
    );
  });
});

function getHandler(
  mockedEventsOn: Mock,
  eventName: string,
): (event: Record<string, string>) => Record<string, string> {
  const eventHandlerEntry = mockedEventsOn.mock.calls.find(([eventNames]) =>
    eventNames.includes(eventName),
  );
  if (!eventHandlerEntry) {
    throw new Error(`イベントハンドラーが登録されていません:${eventName}`);
  }
  return eventHandlerEntry[1];
}
