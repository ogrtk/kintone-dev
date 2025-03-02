import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { AppIndex, AppRecord } from "@/src/components/customize/App";
import type { PluginConfig } from "@/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// テスト上、CSSを無視するためのmock
vi.mock("@ogrtk/shared-styles", () => ({}));

// QRリーダーコンポーネントのmock
let mockQrReaderDecodedString = "";
vi.mock("../../../src/components/customize/QrReader", () => ({
  QrReader: ({ action }: { action: (arg: string) => void }) => (
    <button
      type="button"
      data-testid="qrreader-btn"
      onClick={() => action(mockQrReaderDecodedString)}
    >
      QRコードをスキャン!
    </button>
  ),
}));

// kintone RESTAPI client のmock
const mockGetRecordsFn = vi.fn();
const mockAddRecordFn = vi.fn();
const mockUpdateRecordFn = vi.fn();
vi.mock("@kintone/rest-api-client", () => ({
  KintoneRestAPIClient: vi.fn().mockImplementation(() => ({
    record: {
      getRecords: mockGetRecordsFn,
      addRecord: mockAddRecordFn,
      updateRecord: mockUpdateRecordFn,
    },
  })),
}));

// グローバルオブジェクト kintone のmock
const mockKintoneAppRecordGetFn = vi.fn();
const mockKintoneAppRecordSetFn = vi.fn();
const mockKintoneAppGetLookupTargetAppId = vi.fn();
globalThis.kintone = {
  app: {
    record: {
      get: mockKintoneAppRecordGetFn,
      set: mockKintoneAppRecordSetFn,
    } as unknown as typeof kintone.app.record,
    getId: vi.fn(() => 123),
    getLookupTargetAppId: mockKintoneAppGetLookupTargetAppId,
  } as unknown as typeof kintone.app,
} as unknown as typeof kintone;

// window の mock
let mockWindowConfirmResult = true;
const mockAlertFn = vi.fn();
const mockReloadFn = vi.fn();
vi.stubGlobal(
  "confirm",
  vi.fn(() => mockWindowConfirmResult),
);
vi.stubGlobal("alert", mockAlertFn);
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    href: "",
    reload: mockReloadFn,
    origin: "https://mocked.origin.com",
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("AppRecord", () => {
  test("QRコードをスキャンしてレコードを編集する", async () => {
    /* arrange */
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["record"],
        record: { space: "spaceItemId" },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockKintoneAppRecordGetFn.mockImplementation(() => ({
      record: {
        qrCodeField: { value: "before edit" },
      },
    }));
    mockKintoneAppGetLookupTargetAppId.mockReturnValue(null);
    render(<AppRecord config={mockPluginConfig} />);

    /* action */
    // QRコードスキャンボタンをクリック
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    // actionで渡されるqrコード読み取り結果がsetで編集される
    expect(mockKintoneAppRecordSetFn).toHaveBeenCalledOnce();
    expect(mockKintoneAppRecordSetFn).toHaveBeenCalledWith({
      record: { qrCodeField: { value: "qrKeyValue" } },
    });
  });

  test("QRコードをスキャンしてレコードを編集する(Lookup項目)", async () => {
    /* arrange */
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["record"],
        record: { space: "spaceItemId" },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockKintoneAppRecordGetFn.mockImplementation(() => ({
      record: {
        qrCodeField: { value: "before edit" },
      },
    }));
    mockKintoneAppGetLookupTargetAppId.mockReturnValue("124");
    render(<AppRecord config={mockPluginConfig} />);

    /* action */
    // QRコードスキャンボタンをクリック
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    // actionで渡されるqrコード読み取り結果がsetで編集される
    expect(mockKintoneAppRecordSetFn).toHaveBeenCalledOnce();
    expect(mockKintoneAppRecordSetFn).toHaveBeenCalledWith({
      record: { qrCodeField: { value: "qrKeyValue", lookup: true } },
    });
  });
});

describe("AppIndex > regist ", () => {
  test("重複チェックあり・データの重複なし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: true,
          useAdditionalValues: false,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({ records: [] });

    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockAddRecordFn).toHaveBeenCalledOnce();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        qrCodeField: { value: "qrKeyValue" },
      },
    });
  });

  test("重複チェックあり・データの重複あり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: true,
          useAdditionalValues: false,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [{ qrCodeField: { value: "qrKeyValue" } }],
    });
    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockAddRecordFn).not.toHaveBeenCalled();
    expect(mockAlertFn).toHaveBeenCalledWith(
      "既にデータが存在します(qrKeyValue)",
    );
  });

  test("重複チェックなし・データの重複なし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: false,
          useAdditionalValues: false,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [],
    });
    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).not.toHaveBeenCalled();
    expect(mockAddRecordFn).toHaveBeenCalledOnce();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        qrCodeField: { value: "qrKeyValue" },
      },
    });
  });

  test("重複チェックなし・データの重複あり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: false,
          useAdditionalValues: false,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [{ qrCodeField: { value: "qrKeyValue" } }],
    });
    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).not.toHaveBeenCalled();
    expect(mockAddRecordFn).toHaveBeenCalledOnce();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        qrCodeField: { value: "qrKeyValue" },
      },
    });
  });

  test("登録時の追加項目設定値", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: true,
          useAdditionalValues: true,
          additionalValues: [
            { field: "additinalField1", value: `{"value":"additinalValue1"}` },
            { field: "additinalField2", value: `{"value":"additinalValue2"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({ records: [] });

    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockAddRecordFn).toHaveBeenCalledOnce();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        qrCodeField: { value: "qrKeyValue" },
        additinalField1: { value: "additinalValue1" },
        additinalField2: { value: "additinalValue2" },
      },
    });
  });

  test("重複チェックあり（追加検索条件あり）", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listRegistView",
          noDuplicate: true,
          useAdditionalValues: false,
          duplicateCheckAdditionalQuery: `有効 in "true"`,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({ records: [] });

    render(<AppIndex config={mockPluginConfig} mode={"regist"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue" and 有効 in "true"',
    });
    expect(mockAddRecordFn).toHaveBeenCalledOnce();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        qrCodeField: { value: "qrKeyValue" },
      },
    });
  });
});

describe("AppIndex > update ", () => {
  test("追加検索条件なし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listUpdateView",
          additionalQuery: "",
          updateValues: [
            { field: "updateField1", value: `{"value":"updated1"}` },
            { field: "updateField2", value: `{"value":"updated2"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          $revision: { type: "__REVISION__", value: "5" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"update"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledOnce();
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "1",
      revision: "5",
      record: {
        updateField1: {
          value: "updated1",
        },
        updateField2: {
          value: "updated2",
        },
      },
    });
    expect(mockAlertFn).toHaveBeenCalledWith("更新しました");
  });

  test("追加検索条件あり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listUpdateView",
          additionalQuery: `有効 in "true"`,
          updateValues: [
            { field: "updateField1", value: `{"value":"updated1"}` },
            { field: "updateField2", value: `{"value":"updated2"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          $revision: { type: "__REVISION__", value: "5" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"update"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue" and 有効 in "true"',
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledOnce();
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "1",
      revision: "5",
      record: {
        updateField1: {
          value: "updated1",
        },
        updateField2: {
          value: "updated2",
        },
      },
    });
    expect(mockAlertFn).toHaveBeenCalledWith("更新しました");
  });

  test("対象データなし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listUpdateView",
          additionalQuery: "",
          updateValues: [
            { field: "updateField1", value: `{"value":"updated1"}` },
            { field: "updateField2", value: `{"value":"updated2"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [],
    });

    render(<AppIndex config={mockPluginConfig} mode={"update"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockUpdateRecordFn).not.toHaveBeenCalled();
    expect(mockAlertFn).toHaveBeenCalledWith(
      "対象のデータが存在しません(qrKeyValue)",
    );
  });

  test("複数データあり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listUpdateView",
          additionalQuery: "",
          updateValues: [
            { field: "updateField1", value: `{"value":"updated1"}` },
            { field: "updateField2", value: `{"value":"updated2"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          $revision: { type: "__REVISION__", value: "5" },
          qrCodeField: { value: "qrKeyValue" },
        },
        {
          $id: { type: "__ID__", value: "2" },
          $revision: { type: "__REVISION__", value: "6" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"update"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockUpdateRecordFn).not.toHaveBeenCalled();
    expect(mockAlertFn).toHaveBeenCalledWith(
      "更新できません：複数のデータが該当します(qrKeyValue)",
    );
  });

  test("revision不一致", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listUpdateView",
          additionalQuery: "",
          updateValues: [
            { field: "updateField1", value: `{"value":"updated1"}` },
          ],
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          $revision: { type: "__REVISION__", value: "5" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });
    mockUpdateRecordFn.mockImplementation(() => {
      throw new Error("revision不一致");
    });

    render(<AppIndex config={mockPluginConfig} mode={"update"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledOnce();
    expect(mockAlertFn).toHaveBeenCalledWith(
      `更新処理中にエラーが発生しました(他ユーザの更新と競合した可能性があります)
revision不一致`,
    );
  });
});

describe("AppIndex > search ", () => {
  test("追加検索条件なし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listSearch"],
        listSearch: { targetViewName: "listSearchView", additionalQuery: "" },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"search"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(window.location.href).toEqual(
      "https://mocked.origin.com/k/123/show#record=1",
    );
  });

  test("追加検索条件あり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listSearch"],
        listSearch: {
          targetViewName: "listSearchView",
          additionalQuery: `有効 in "true"`,
        },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"search"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue" and 有効 in "true"',
    });
    expect(window.location.href).toEqual(
      "https://mocked.origin.com/k/123/show#record=1",
    );
  });

  test("対象データなし", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listSearch"],
        listSearch: { targetViewName: "listSearchView", additionalQuery: "" },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [],
    });

    render(<AppIndex config={mockPluginConfig} mode={"search"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockAlertFn).toHaveBeenCalledWith(
      "対象のデータが存在しません(qrKeyValue)",
    );
  });

  test("複数データあり", async () => {
    /* arrange */
    mockWindowConfirmResult = true;
    const mockPluginConfig: PluginConfig = {
      qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
      useCase: {
        types: ["listSearch"],
        listSearch: { targetViewName: "listSearchView", additionalQuery: "" },
      },
    };
    mockQrReaderDecodedString = "qrKeyValue";
    mockGetRecordsFn.mockResolvedValue({
      records: [
        {
          $id: { type: "__ID__", value: "1" },
          qrCodeField: { value: "qrKeyValue" },
        },
        {
          $id: { type: "__ID__", value: "2" },
          qrCodeField: { value: "qrKeyValue" },
        },
      ],
    });

    render(<AppIndex config={mockPluginConfig} mode={"search"} />);

    /* action */
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    /* assert */
    expect(mockGetRecordsFn).toHaveBeenCalledOnce();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: 'qrCodeField = "qrKeyValue"',
    });
    expect(mockAlertFn).toHaveBeenCalledWith(
      "対象のデータを特定できません：複数のデータが該当します(qrKeyValue)",
    );
  });
});
