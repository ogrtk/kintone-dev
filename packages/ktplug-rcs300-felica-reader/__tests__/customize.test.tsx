import { AppIndex, AppRecord } from "@/src/components/customize/App";
import type { PluginConfig } from "@/src/types";
import { restorePluginConfig } from "@ogrtk/shared/kintone-utils";
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
vi.mock("@ogrtk/shared/kintone-utils", async () => {
  const actual = await vi.importActual<
    typeof import("@ogrtk/shared/kintone-utils")
  >("@ogrtk/shared/kintone-utils");
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
      const mockedConfig: PluginConfig = {
        useCase: {
          types: ["record"],
          record: { targetSpacer: "reader" },
        },
        readConfig: {
          readType: "idm",
          idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
        },
      };
      (restorePluginConfig as Mock).mockReturnValue({
        success: true,
        data: mockedConfig,
      });
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
        <AppRecord PLUGIN_ID={globalThis.kintone.$PLUGIN_ID} />,
      );
    },
  );

  test.each([
    {
      useCase: {
        types: ["listRegist"],
        record: { targetSpacer: "space1" },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    } as PluginConfig,
    {
      useCase: {
        types: ["record"],
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    } as PluginConfig,
  ])(
    "指定したスペース位置にAppRecordコンポーネントが設置される(config: %s)",
    (mockedConfig) => {
      /* arrange */
      (restorePluginConfig as Mock).mockReturnValue({
        success: true,
        data: mockedConfig,
      });
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
    },
  );

  test("カードリーダーの設置スペースが存在しない場合はエラー", () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });
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
      "カードリーダーボタン設置用の項目がありません:space1",
    );
  });
});
describe("index画面のカスタマイズ処理", () => {
  test("設定した一覧ビューにカードリーダーが設置される(regist)", () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "登録用一覧",
          useAdditionalValues: true,
          additionalValues: [],
          noDuplicate: true,
          confirmBefore: true,
          notifyAfter: true,
        },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "登録用一覧" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);
    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalledWith(
      <AppIndex PLUGIN_ID={globalThis.kintone.$PLUGIN_ID} indexMode="regist" />,
    );
  });

  test("設定した一覧ビューにカードリーダーが設置される(update)", () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "更新用一覧",
          updateValues: [
            { field: "updateField", value: `{"value":"updateFieldValue"}` },
          ],
          additionalQuery: "update additional query",
          confirmBefore: true,
          notifyAfter: true,
        },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });
    const mockElement = document.createElement("div");
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      mockElement,
    );

    /* action */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "更新用一覧" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(createRoot as Mock).toHaveBeenCalledWith(mockElement);
    const rootResult = (createRoot as Mock).mock.results[0].value;
    expect(rootResult.render).toHaveBeenCalledWith(
      <AppIndex PLUGIN_ID={globalThis.kintone.$PLUGIN_ID} indexMode="update" />,
    );
  });

  test("カードリーダーの設置スペースが存在しない場合はエラー", () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "登録用一覧",
          useAdditionalValues: true,
          additionalValues: [],
          noDuplicate: true,
          confirmBefore: true,
          notifyAfter: true,
        },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });
    (globalThis.kintone.app.getHeaderSpaceElement as Mock).mockReturnValue(
      null,
    );

    /* action & assert */
    const eventHandler = getHandler(
      globalThis.kintone.events.on as Mock,
      "app.record.index.show",
    );
    const event = { viewName: "登録用一覧" }; // モックの一覧ビューイベント
    expect(() => eventHandler(event)).toThrow(
      "カードリーダー設置用のヘッダスペースが取得できません",
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
