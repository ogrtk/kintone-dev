// __tests__/App.test.tsx
import { AppIndex, AppRecord } from "@/src/components/customize/App"; // ※ファイルパスは調整してください
import { WebUsbCardReader } from "@/src/lib/WebUsbCardReader";
import type { PluginConfig } from "@/src/types";
import type { KintoneRecordField } from "@kintone/rest-api-client";
import { restorePluginConfig } from "@ogrtk/shared/kintone-utils";
import { suppressNoisyError } from "@ogrtk/shared/test-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "react-error-boundary";
import { type Mock, beforeEach, describe, expect, it, test, vi } from "vitest";

// --- モジュール依存のモック設定 ---
// window の mock
let mockWindowConfirmResult = true;
const mockAlertFn = vi.fn();
const mockConfirmFn = vi.fn(() => mockWindowConfirmResult);
vi.stubGlobal("alert", mockAlertFn);
vi.stubGlobal("confirm", mockConfirmFn);
const mockReloadFn = vi.fn();

// kintone グローバルオブジェクトのモック
globalThis.kintone = {
  app: {
    record: {
      // 編集前のレコードを返す（editRecord で使用）
      get: vi.fn(() => ({
        record: {
          FIELD1: { value: "" },
          FIELD2: { value: "" },
          FIELD3: { value: "" },
          FIELD4: { value: "" },
        },
      })),
      set: vi.fn(),
    },
    getLookupTargetAppId: vi.fn(() => null),
    getId: vi.fn(() => 123),
  },
} as unknown as typeof kintone;

// restorePluginConfig のモック（@ogrtk/shared/kintone-utils）
vi.mock("@ogrtk/shared/kintone-utils", () => ({
  restorePluginConfig: vi.fn(() => ({
    success: true,
    data: {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
      },
      useCase: {
        types: ["listRegist", "listUpdate"],
        listRegist: {
          confirmBefore: false,
          noDuplicate: false,
          notifyAfter: true,
          additionalValues: [],
        },
        listUpdate: {
          confirmBefore: false,
          additionalQuery: "",
          notifyAfter: true,
          updateValues: [],
        },
        useAdditionalValues: false,
      },
      uniqueItem: "idm",
    },
  })),
}));

// WebUsbCardReader のモック
vi.mock("@/src/lib/WebUsbCardReader", () => ({
  WebUsbCardReader: {
    connect: vi.fn(async () => ({
      polling: vi.fn(async () => ({ idm: "DUMMY_IDM" })),
      readWithoutEncryption: vi.fn(async () => ({
        idm: "DUMMY_IDM2",
        blockData: "44 49 4E 41", // "DINA" in hex (without spaces after trim)
      })),
    })),
  },
}));

type KintoneRecord = {
  $id: KintoneRecordField.ID;
} & {
  [key: string]: KintoneRecordField.OneOf;
};

// kintone RESTAPI client の  mock
const mockGetRecordsFn = vi.fn(async () => ({
  records: [] as KintoneRecord[],
}));
const mockAddRecordFn = vi.fn(async () => ({}));
const mockUpdateRecordFn = vi.fn(async () => ({}));
vi.mock("@kintone/rest-api-client", () => ({
  KintoneRestAPIClient: vi.fn(() => ({
    record: {
      getRecords: mockGetRecordsFn,
      addRecord: mockAddRecordFn,
      updateRecord: mockUpdateRecordFn,
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      search: "?autorun=true",
      href: "http://dummy",
      reload: mockReloadFn,
    },
  });
});

// --- コンポーネントと関数のインポート ---
// --- AppRecord のテスト ---
describe("AppRecord Component", () => {
  test("正常：読取種別IDm、IDm項目2のみルックアップ", async () => {
    /** arrange */
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD1") return null;
        if (fieldCd === "FIELD2") return 1234;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    // editRecord 内で kintone.app.record.set が呼ばれるので、そちらをチェック
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD1.value).toBe("DUMMY_IDM");
    expect(recordSetArg.FIELD1.lookup).not.toBeDefined();
    expect(recordSetArg.FIELD2.value).toBe("DUMMY_IDM");
    expect(recordSetArg.FIELD2.lookup).toBe(true);
  });

  test("正常：読取種別IDm、IDm項目1のみルックアップ", async () => {
    /** arrange */
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD1") return 1234;
        if (fieldCd === "FIELD2") return null;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD1.value).toBe("DUMMY_IDM");
    expect(recordSetArg.FIELD1.lookup).toBe(true);
    expect(recordSetArg.FIELD2.value).toBe("DUMMY_IDM");
    expect(recordSetArg.FIELD2.lookup).not.toBeDefined();
  });

  test("正常：読取種別IDm、IDm項目2設定無し", async () => {
    /** arrange */
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "idm",
          idm: { fieldCd1: "FIELD1" },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD1") return 1234;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD1.value).toBe("DUMMY_IDM");
    expect(recordSetArg.FIELD1.lookup).toBe(true);
    expect(recordSetArg.FIELD2.value).toBe(""); // no change
  });

  test("正常：読取種別memory、memory項目2のみルックアップ", async () => {
    /** arrange */
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD3") return null;
        if (fieldCd === "FIELD4") return 1234;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD3.value).toBe("IN");
    expect(recordSetArg.FIELD3.lookup).not.toBeDefined();
    expect(recordSetArg.FIELD4.value).toBe("IN");
    expect(recordSetArg.FIELD4.lookup).toBe(true);
  });

  test("正常：読取種別memory、memory項目1のみルックアップ", async () => {
    /** arrange */
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD3") return 1234;
        if (fieldCd === "FIELD4") return null;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD3.value).toBe("IN");
    expect(recordSetArg.FIELD3.lookup).toBe(true);
    expect(recordSetArg.FIELD4.value).toBe("IN");
    expect(recordSetArg.FIELD4.lookup).not.toBeDefined();
  });

  test("正常：読取種別memory、memory項目2無し", async () => {
    /** arrange */
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });
    (kintone.app.getLookupTargetAppId as Mock).mockImplementation(
      (fieldCd: string) => {
        if (fieldCd === "FIELD3") return 1234;
        return null;
      },
    );

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg.FIELD3.value).toBe("IN");
    expect(recordSetArg.FIELD3.lookup).toBe(true);
    expect(recordSetArg.FIELD4.value).toBe("");
    expect(recordSetArg.FIELD4.lookup).not.toBeDefined();
  });

  test("正常：読取種別both、IDm項目1及び2", async () => {
    /** arrange */
    (kintone.app.record.get as Mock).mockReturnValueOnce({
      record: {
        FIELD1: { value: "" },
        FIELD2: { value: "" },
        FIELD3: { value: "" },
        FIELD4: { value: "" },
      },
    });
    (kintone.app.record.get as Mock).mockReturnValueOnce({
      record: {
        FIELD1: { value: "" },
        FIELD2: { value: "" },
        FIELD3: { value: "IN" },
        FIELD4: { value: "IN" },
      },
    });

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: {
            fieldCd1: "FIELD1",
            fieldCd2: "FIELD2",
          },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg1 = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg1.FIELD1.value).toBe("");
    expect(recordSetArg1.FIELD2.value).toBe("");
    expect(recordSetArg1.FIELD3.value).toBe("IN");
    expect(recordSetArg1.FIELD4.value).toBe("IN");

    const recordSetArg2 = (kintone.app.record.set as Mock).mock.calls[1][0]
      .record;
    expect(recordSetArg2.FIELD1.value).toBe("DUMMY_IDM");
    expect(recordSetArg2.FIELD2.value).toBe("DUMMY_IDM");
    expect(recordSetArg2.FIELD3.value).toBe("IN");
    expect(recordSetArg2.FIELD4.value).toBe("IN");
  });

  test("正常：読取種別both、IDm項目1のみ", async () => {
    /** arrange */
    (kintone.app.record.get as Mock).mockReturnValueOnce({
      record: {
        FIELD1: { value: "" },
        FIELD2: { value: "" },
        FIELD3: { value: "" },
        FIELD4: { value: "" },
      },
    });
    (kintone.app.record.get as Mock).mockReturnValueOnce({
      record: {
        FIELD1: { value: "" },
        FIELD2: { value: "" },
        FIELD3: { value: "IN" },
        FIELD4: { value: "IN" },
      },
    });

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: {
            fieldCd1: "FIELD1",
          },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(kintone.app.record.set).toHaveBeenCalled();
    });
    const recordSetArg1 = (kintone.app.record.set as Mock).mock.calls[0][0]
      .record;
    expect(recordSetArg1.FIELD1.value).toBe("");
    expect(recordSetArg1.FIELD2.value).toBe("");
    expect(recordSetArg1.FIELD3.value).toBe("IN");
    expect(recordSetArg1.FIELD4.value).toBe("IN");

    const recordSetArg2 = (kintone.app.record.set as Mock).mock.calls[1][0]
      .record;
    expect(recordSetArg2.FIELD1.value).toBe("DUMMY_IDM");
    expect(recordSetArg2.FIELD2.value).toBe("");
    expect(recordSetArg2.FIELD3.value).toBe("IN");
    expect(recordSetArg2.FIELD4.value).toBe("IN");
  });

  test("異常：WebUSBの接続に失敗", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue(undefined);

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        "カードリーダーを接続してください。",
      );
    });
  });

  test("異常：polling結果がundefined", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
      polling: vi.fn(async () => undefined),
      readWithoutEncryption: vi.fn(async () => ({
        idm: "DUMMY_IDM2",
        blockData: "44 49 4E 41", // "DINA" in hex (without spaces after trim)
      })),
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        "カード読み込みに失敗しました。(polling)",
      );
    });
  });

  test("異常：readWithoutEncryptionの結果がundefined", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
      polling: vi.fn(async () => ({ idm: "DUMMY_IDM" })),
      readWithoutEncryption: vi.fn(async () => undefined),
    });
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        "カード読み込みに失敗しました。(readIdmAndMemory)",
      );
    });
  });

  test("異常：readWithoutEncryptionの読み取ったデータが空", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
      polling: vi.fn(async () => ({ idm: "DUMMY_IDM" })),
      readWithoutEncryption: vi.fn(async () => ({
        idm: "DUMMY_IDM2",
        blockData: "", // "DINA" in hex (without spaces after trim)
      })),
    });
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        "カード読み込みに失敗しました。(readIdmAndMemory)",
      );
    });
  });

  test("異常：カード読取り時に例外発生", async () => {
    const unhandledRejectionSpy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", unhandledRejectionSpy);

    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
      polling: vi.fn().mockRejectedValue(new Error("error occured")),
      // メソッドなし
    });
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["record"],
          record: { targetSpacer: "SPACE1" },
        },
      } as PluginConfig,
    });

    /** action */
    // 「カード読取」ボタンが存在
    // クリックすると readCard が呼ばれ、WebUsbCardReader.connect のモックから polling() が実行される
    render(<AppRecord PLUGIN_ID="dummy-plugin" />);
    const btn = screen.getByRole("button", { name: "カード読取" });
    userEvent.click(btn);

    /** assert */
    await waitFor(() => {
      expect(screen.getByRole("paragraph")).toHaveTextContent(
        "エラーが発生しました: error occured",
      );
    });

    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }
  });

  test("異常：プラグインの設定が不正な場合、例外発生", async () => {
    /* arrange */
    (restorePluginConfig as Mock).mockReturnValue({ success: false });

    /* action */
    suppressNoisyError(() => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <AppRecord PLUGIN_ID="dummy-plugin" />
        </ErrorBoundary>,
      );
    });
    /* assert */
    expect(
      screen.getByText("プラグインの設定にエラーがあります"),
    ).toBeInTheDocument();

    (restorePluginConfig as Mock).mockReset();
  });
});

// --- AppIndex のテスト ---
describe("AppIndex 全般", () => {
  test("正常：カード読取を自動実行(autorun=true)", async () => {
    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);
    // autorun が true の場合、useEffect 内でカード読取が実行され、最終的に window.location.href が更新されるはず
    await waitFor(() => {
      expect(mockAddRecordFn).toHaveBeenCalled();
      expect(window.location.href).toContain("autorun=true");
    });
  });

  test("正常：カード読取を手動実行(autorun=trueではない)", async () => {
    // autorun が false のケース
    Object.defineProperty(window, "location", {
      writable: true,
      value: { search: "", href: "http://dummy" },
    });
    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    const btn = await screen.findByRole("button", {
      name: "カード読み取り開始",
    });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(mockAddRecordFn).toHaveBeenCalledOnce();
      expect(window.location.href).toContain("autorun=true");
    });
  });

  test("異常：kintoneのappIDが取得できない", async () => {
    const unhandledRejectionSpy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", unhandledRejectionSpy);

    (kintone.app.getId as Mock).mockReturnValueOnce(undefined);

    suppressNoisyError(() => {
      render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />
        </ErrorBoundary>,
      );
    });

    /* assert */
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "アプリケーションのIDが取得できません。",
      );
    });

    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }
  });

  test("異常：プラグインの設定値が不正", async () => {
    const unhandledRejectionSpy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", unhandledRejectionSpy);

    /* arrange */
    (restorePluginConfig as Mock).mockReturnValueOnce({ success: false });

    /* action */
    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    /* assert */
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "プラグインの設定にエラーがあります",
      );
    });

    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }
  });

  test("異常：カード読み取り結果が空", async () => {
    /* arrange */
    (WebUsbCardReader.connect as Mock).mockReturnValue(undefined);

    /* action */
    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    /* assert */
    await waitFor(() => {
      expect(window.location.href).not.toContain("autorun=true");
    });
    expect(mockAddRecordFn).not.toHaveBeenCalled();
  });
});

describe("AppIndex 登録", () => {
  test("正常：事前確認あり、重複チェックあり（追加クエリあり）、readType=both(キー:idm)、追加項目あり、事後通知あり", async () => {
    mockWindowConfirmResult = true;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: true,
            notifyAfter: true,
            noDuplicate: true,
            duplicateCheckAdditionalQuery: "additional query",
            useAdditionalValues: true,
            additionalValues: [
              {
                field: "additionalField",
                value: `{"value":"additionalValue"}`,
              },
            ],
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).toHaveBeenCalledWith(
      "登録してよろしいですか？\n(IDm: DUMMY_IDM memory: IN)",
    );
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD1 = "DUMMY_IDM" and additional query`,
    });
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        FIELD1: { value: "DUMMY_IDM" },
        FIELD2: { value: "DUMMY_IDM" },
        FIELD3: { value: "IN" },
        FIELD4: { value: "IN" },
        additionalField: { value: "additionalValue" },
      },
    });
    expect(mockAlertFn).toHaveBeenCalledWith(
      "登録が完了しました\n(IDm: DUMMY_IDM memory: IN)",
    );
  });

  test("正常：事前確認あり、重複チェックあり（追加クエリなし）、readType=idm、追加項目あり、事後通知あり", async () => {
    mockWindowConfirmResult = true;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "idm",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: true,
            notifyAfter: true,
            noDuplicate: true,
            useAdditionalValues: true,
            additionalValues: [
              {
                field: "additionalField",
                value: `{"value":"additionalValue"}`,
              },
            ],
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).toHaveBeenCalledWith(
      "登録してよろしいですか？\n(IDm: DUMMY_IDM)",
    );
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD1 = "DUMMY_IDM"`,
    });
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        FIELD1: { value: "DUMMY_IDM" },
        FIELD2: { value: "DUMMY_IDM" },
        additionalField: { value: "additionalValue" },
      },
    });
    expect(mockAlertFn).toHaveBeenCalledWith(
      "登録が完了しました\n(IDm: DUMMY_IDM)",
    );
  });

  test("正常：事前確認なし、重複チェックなし、readType=memory、追加項目なし、事後通知なし", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: false,
            notifyAfter: false,
            noDuplicate: false,
            useAdditionalValues: false,
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).not.toHaveBeenCalled();
    expect(mockGetRecordsFn).not.toHaveBeenCalled();
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        FIELD3: { value: "IN" },
        FIELD4: { value: "IN" },
      },
    });
    expect(mockAlertFn).not.toHaveBeenCalled();
  });

  test("正常：重複チェックあり、readType=both(キー:memory)", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "memory",
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: false,
            notifyAfter: false,
            noDuplicate: true,
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD3 = "IN"`,
    });
    expect(mockAddRecordFn).toHaveBeenCalledWith({
      app: 123,
      record: {
        FIELD1: { value: "DUMMY_IDM" },
        FIELD2: { value: "DUMMY_IDM" },
        FIELD3: { value: "IN" },
        FIELD4: { value: "IN" },
      },
    });
  });

  test("異常：登録処理用の設定が不正", async () => {
    const unhandledRejectionSpy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", unhandledRejectionSpy);

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listRegist"],
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    /* assert */
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "登録処理を行う設定になっていません。処理を中断します。",
      );
    });

    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }
  });

  test("異常：事前確認で中断", async () => {
    mockWindowConfirmResult = false;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: true,
            notifyAfter: true,
            noDuplicate: true,
            duplicateCheckAdditionalQuery: "additional query",
            useAdditionalValues: true,
            additionalValues: [
              {
                field: "additionalField",
                value: `{"value":"additionalValue"}`,
              },
            ],
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(mockReloadFn).toHaveBeenCalledWith();
    });
    expect(mockConfirmFn).toHaveBeenCalledWith(
      "登録してよろしいですか？\n(IDm: DUMMY_IDM memory: IN)",
    );
    expect(mockAddRecordFn).not.toHaveBeenCalled();
  });

  test("異常：データ重複あり", async () => {
    mockWindowConfirmResult = true;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: false,
            notifyAfter: false,
            noDuplicate: true,
            duplicateCheckAdditionalQuery: "additional query",
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        `既にデータが存在します(FIELD1 = "DUMMY_IDM")`,
      );
    });

    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD1 = "DUMMY_IDM" and additional query`,
    });
    expect(mockAddRecordFn).not.toHaveBeenCalled();
  });

  test("異常：登録処理時に例外発生", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listRegist"],
          listRegist: {
            targetViewName: "registView",
            confirmBefore: false,
            notifyAfter: false,
            noDuplicate: true,
            duplicateCheckAdditionalQuery: "additional query",
          },
        },
      } as PluginConfig,
    });
    mockAddRecordFn.mockRejectedValue("error occured");

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);

    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        "登録に失敗しました（重複登録の可能性があります）",
      );
      expect(mockReloadFn).toHaveBeenCalledWith();
    });
  });
});

describe("AppIndex 更新", () => {
  test("正常：事前確認あり、追加クエリあり、readType=both(キー:idm)、事後通知あり", async () => {
    mockWindowConfirmResult = true;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: true,
            notifyAfter: true,
            additionalQuery: "additional query",
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).toHaveBeenCalledWith(
      "更新してよろしいですか？\n(IDm: DUMMY_IDM memory: IN)",
    );
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD1 = "DUMMY_IDM" and additional query`,
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "id",
      record: {
        updateField1: { value: "updateValue1" },
        updateField2: { value: "updateValue2" },
      },
    });
    expect(mockAlertFn).toHaveBeenCalledWith(
      "更新が完了しました\n(IDm: DUMMY_IDM memory: IN)",
    );
  });

  test("正常：事前確認なし、追加クエリなし、readType=both(キー:memory)、事後通知なし", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "memory",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).not.toHaveBeenCalled();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD3 = "IN"`,
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "id",
      record: {
        updateField1: { value: "updateValue1" },
        updateField2: { value: "updateValue2" },
      },
    });
    expect(mockAlertFn).not.toHaveBeenCalled();
  });

  test("正常：事前確認なし、追加クエリなし、readType=idm、事後通知なし", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "idm",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).not.toHaveBeenCalled();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD1 = "DUMMY_IDM"`,
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "id",
      record: {
        updateField1: { value: "updateValue1" },
        updateField2: { value: "updateValue2" },
      },
    });
    expect(mockAlertFn).not.toHaveBeenCalled();
  });

  test("正常：事前確認なし、追加クエリなし、readType=memory、事後通知なし", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "memory",
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(window.location.href).toContain("autorun=true");
    });

    expect(mockConfirmFn).not.toHaveBeenCalled();
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD3 = "IN"`,
    });
    expect(mockUpdateRecordFn).toHaveBeenCalledWith({
      app: 123,
      id: "id",
      record: {
        updateField1: { value: "updateValue1" },
        updateField2: { value: "updateValue2" },
      },
    });
    expect(mockAlertFn).not.toHaveBeenCalled();
  });

  test("異常：更新処理用の設定が不正", async () => {
    const unhandledRejectionSpy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", unhandledRejectionSpy);

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listUpdate"],
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    /* assert */
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "更新処理を行う設定になっていません。処理を中断します。",
      );
    });

    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }
  });

  test("異常：事前確認で中断", async () => {
    mockWindowConfirmResult = false;

    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: true,
            notifyAfter: true,
            additionalQuery: "additional query",
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(mockReloadFn).toHaveBeenCalledWith();
    });
    expect(mockConfirmFn).toHaveBeenCalledWith(
      "更新してよろしいですか？\n(IDm: DUMMY_IDM memory: IN)",
    );
    expect(mockAddRecordFn).not.toHaveBeenCalled();
  });

  test("異常：更新対象データなし", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "memory",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({ records: [] });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        `対象のデータが存在しません(FIELD3 = "IN")`,
      );
    });
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD3 = "IN"`,
    });
    expect(mockUpdateRecordFn).not.toHaveBeenCalled();
  });

  test("異常：更新対象データが複数該当", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "memory",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [
        { $id: { type: "__ID__", value: "id1" } },
        { $id: { type: "__ID__", value: "id2" } },
      ],
    });

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith(
        `更新できません：複数のデータが該当します(FIELD3 = "IN")`,
      );
    });
    expect(mockGetRecordsFn).toHaveBeenCalledWith({
      app: 123,
      query: `FIELD3 = "IN"`,
    });
    expect(mockUpdateRecordFn).not.toHaveBeenCalled();
  });

  test("異常：更新処理時に例外発生", async () => {
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: {
        readConfig: {
          readType: "both",
          idm: { fieldCd1: "FIELD1", fieldCd2: "FIELD2" },
          memory: {
            fieldCd1: "FIELD3",
            fieldCd2: "FIELD4",
            block: { start: 2, end: 4 },
            name: "番号",
            serviceCode: "0ABC",
            slice: { start: 2, end: 6 },
          },
          uniqueItem: "idm",
        },
        useCase: {
          types: ["listUpdate"],
          listUpdate: {
            targetViewName: "updateView",
            confirmBefore: false,
            notifyAfter: false,
            updateValues: [
              { field: "updateField1", value: `{"value":"updateValue1"}` },
              { field: "updateField2", value: `{"value":"updateValue2"}` },
            ],
          },
        },
      } as PluginConfig,
    });
    mockGetRecordsFn.mockResolvedValue({
      records: [{ $id: { type: "__ID__", value: "id" } }],
    });
    mockUpdateRecordFn.mockRejectedValue("error occured");

    render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);

    await waitFor(() => {
      expect(mockAlertFn).toHaveBeenCalledWith("更新に失敗しました");
      expect(mockReloadFn).toHaveBeenCalledWith();
    });
  });
});

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
