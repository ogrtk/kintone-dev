import {
  mockCreateRoot,
  mockEventsOn,
  mockGetHeaderSpaceElement,
  mockGetSpaceElement,
  mockRender,
  mockRestorePluginConfig,
} from "./customize.setup";
import "../src/customize";
import { AppIndex, AppRecord } from "@/src/components/customize/App";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";
import type { PluginConfig } from "../src/types";

beforeEach(() => {
  mockCreateRoot.mockClear();
  mockGetHeaderSpaceElement.mockClear();
  mockGetSpaceElement.mockClear();
  mockRender.mockClear();
  mockRestorePluginConfig.mockClear();
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
      mockRestorePluginConfig.mockReturnValue(mockConfig);
      const mockElement = document.createElement("div");
      mockGetSpaceElement.mockReturnValue(mockElement);

      /* action */
      const eventHandler = getHandler(mockEventsOn, eventName);
      const event = {}; // ダミーイベント
      eventHandler(event);

      /* assert */
      expect(mockGetSpaceElement).toHaveBeenCalledWith("reader");
      expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);
      expect(mockRender).toHaveBeenCalledWith(
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    // スペースが存在しないものとする
    mockGetSpaceElement.mockReturnValue(null);

    /* action */
    const eventHandler = getHandler(mockEventsOn, "app.record.edit.show");
    const event = {}; // ダミーイベント
    eventHandler(event);

    /* assert */
    expect(mockGetSpaceElement).not.toHaveBeenCalled();
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    // スペースが存在しないものとする
    mockGetSpaceElement.mockReturnValue(null);

    /* action & assert */
    const eventHandler = getHandler(mockEventsOn, "app.record.edit.show");
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    mockGetHeaderSpaceElement.mockReturnValue(mockElement);

    /* action */
    const eventHandler = getHandler(mockEventsOn, "app.record.index.show");
    const event = { viewName: "登録画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);
    expect(mockRender).toHaveBeenCalledWith(
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    mockGetHeaderSpaceElement.mockReturnValue(mockElement);

    /* action */
    const eventHandler = getHandler(mockEventsOn, "app.record.index.show");
    const event = { viewName: "更新画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);
    expect(mockRender).toHaveBeenCalledWith(
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    mockGetHeaderSpaceElement.mockReturnValue(mockElement);

    /* action */
    const eventHandler = getHandler(mockEventsOn, "app.record.index.show");
    const event = { viewName: "検索画面" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);
    expect(mockRender).toHaveBeenCalledWith(
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    const mockElement = document.createElement("div");
    mockGetHeaderSpaceElement.mockReturnValue(mockElement);

    /* action */
    const eventHandler = getHandler(mockEventsOn, "app.record.index.show");
    const event = { viewName: "record" }; // モックの一覧ビューイベント
    eventHandler(event);

    /* assert */
    expect(mockCreateRoot).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
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
    mockRestorePluginConfig.mockReturnValue(mockConfig);
    mockGetHeaderSpaceElement.mockReturnValue(null);

    /* action & assert */
    const eventHandler = getHandler(mockEventsOn, "app.record.index.show");
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
