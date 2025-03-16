// __tests__/App.test.tsx
import { AppIndex, AppRecord } from "@/src/components/customize/App"; // ※ファイルパスは調整してください
import { WebUsbCardReader } from "@/src/lib/WebUsbCardReader";
import type { PluginConfig } from "@/src/types";
import { restorePluginConfig } from "@ogrtk/shared/kintone-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "react-error-boundary";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

// --- モジュール依存のモック設定 ---
// window の mock
const mockAlertFn = vi.fn();
vi.stubGlobal("alert", mockAlertFn);

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

// KintoneRestAPIClient のモック（最低限の動作）
vi.mock("@kintone/rest-api-client", () => {
  class FakeKintoneRestAPIClient {
    record = {
      getRecords: vi.fn(async () => ({ records: [] })),
      addRecord: vi.fn(async () => ({})),
      updateRecord: vi.fn(async () => ({})),
    };
  }
  return { KintoneRestAPIClient: FakeKintoneRestAPIClient };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// --- コンポーネントと関数のインポート ---
// --- AppRecord のテスト ---
describe("AppRecord Component", () => {
  it("読取種別IDm、IDm項目2のみルックアップ", async () => {
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

  it("読取種別IDm、IDm項目1のみルックアップ", async () => {
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

  it("読取種別IDm、IDm項目2設定無し", async () => {
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

  it("読取種別momory、memory項目2のみルックアップ", async () => {
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

  it("読取種別momory、memory項目1のみルックアップ", async () => {
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

  it("読取種別momory、memory項目2無し", async () => {
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

  it("読取種別both、IDm項目1及び2", async () => {
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
    expect(recordSetArg2.FIELD1.value).toBe("DUMMY_IDM2");
    expect(recordSetArg2.FIELD2.value).toBe("DUMMY_IDM2");
    expect(recordSetArg2.FIELD3.value).toBe("IN");
    expect(recordSetArg2.FIELD4.value).toBe("IN");
  });

  it("読取種別both、IDm項目1のみ", async () => {
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
    expect(recordSetArg2.FIELD1.value).toBe("DUMMY_IDM2");
    expect(recordSetArg2.FIELD2.value).toBe("");
    expect(recordSetArg2.FIELD3.value).toBe("IN");
    expect(recordSetArg2.FIELD4.value).toBe("IN");
  });

  it("WebUSBの接続に失敗", async () => {
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

  it("polling結果がundefined", async () => {
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

  it("readWithoutEncryptionの結果がundefined", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
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

  it("readWithoutEncryptionの読み取ったデータが空", async () => {
    /** arrange */
    (WebUsbCardReader.connect as Mock).mockResolvedValue({
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

  it("プラグインの設定が異常な場合、例外発生", async () => {
    /* arrange */
    (restorePluginConfig as Mock).mockReturnValue({ success: false });

    /* action */
    render(
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AppRecord PLUGIN_ID="dummy-plugin" />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText("プラグインの設定にエラーがあります"),
    ).toBeInTheDocument();

    (restorePluginConfig as Mock).mockReset();
  });
});

// --- AppIndex のテスト ---
// describe("AppIndex Component", () => {
//   beforeEach(() => {
//     // URLSearchParams のテスト用に window.location.search を設定
//     Object.defineProperty(window, "location", {
//       writable: true,
//       value: { search: "?autorun=true", href: "http://dummy" },
//     });
//   });

// it("automatically triggers card reading when autorun=true", async () => {
//   render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="regist" />);
//   // autorun が true の場合、useEffect 内でカード読取が実行され、最終的に window.location.href が更新されるはず
//   await waitFor(() => {
//     expect(window.location.href).toContain("autorun=true");
//   });
// });

// it("triggers card reading on button click (update mode)", async () => {
//   // autorun が false のケース
//   Object.defineProperty(window, "location", {
//     writable: true,
//     value: { search: "", href: "http://dummy" },
//   });
//   render(<AppIndex PLUGIN_ID="dummy-plugin" indexMode="update" />);
//   const btn = screen.getByRole("button", { name: "カード読み取り開始" });
//   fireEvent.click(btn);
//   await waitFor(() => {
//     expect(window.location.href).toContain("autorun=true");
//   });
// });
// });

// // --- constructKeyCriteria のテス() => renderト ---
// describe("constructKeyCriteria function", () => {
//   it('returns key criteria for "idm" read type', () => {
//     const config = {
//       readConfig: { readType: "idm", idm: { fieldCd1: "FIELD1" } },
//     };
//     const result = constructKeyCriteria(config, {
//       idm: "TEST_IDM",
//       memory: "",
//     });
//     expect(result).toBe('FIELD1 = "TEST_IDM"');
//   });
//   it('returns key criteria for "memory" read type', () => {
//     const config = {
//       readConfig: { readType: "memory", memory: { fieldCd1: "FIELD3" } },
//     };
//     const result = constructKeyCriteria(config, {
//       idm: "",
//       memory: "TEST_MEM",
//     });
//     expect(result).toBe('FIELD3 = "TEST_MEM"');
//   });
//   it('returns key criteria for "both" read type with uniqueItem "idm"', () => {
//     const config = {
//       readConfig: {
//         readType: "both",
//         idm: { fieldCd1: "FIELD1" },
//         memory: { fieldCd1: "FIELD3" },
//       },
//       uniqueItem: "idm",
//     };
//     const result = constructKeyCriteria(config, {
//       idm: "TEST_IDM",
//       memory: "TEST_MEM",
//     });
//     expect(result).toBe('FIELD1 = "TEST_IDM"');
//   });
//   it('returns key criteria for "both" read type with uniqueItem "memory"', () => {
//     const config = {
//       readConfig: {
//         readType: "both",
//         idm: { fieldCd1: "FIELD1" },
//         memory: { fieldCd1: "FIELD3" },
//       },
//       uniqueItem: "memory",
//     };
//     const result = constructKeyCriteria(config, {
//       idm: "TEST_IDM",
//       memory: "TEST_MEM",
//     });
//     expect(result).toBe('FIELD3 = "TEST_MEM"');
//   });
// });

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
