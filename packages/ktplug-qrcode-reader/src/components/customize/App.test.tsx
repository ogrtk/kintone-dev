import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PluginConfig } from "@/src/types";
import { jest } from "@jest/globals";
import type { KintoneRecord } from "@ogrtk/shared-components";
import userEvent from "@testing-library/user-event";
import { AppIndex, AppRecord, type IndexMode } from "./App";

// モック関数
jest.mock(
  path.resolve(__dirname, "src", "components", "customize", "QrReader"),
  () => ({
    QrReader: jest.fn(({ action }) => (
      <button
        type="button"
        data-testid="qrreader-btn"
        onClick={() => action("mock-qr-code-text")}
      >
        QRコードをスキャン
      </button>
    )),
  }),
);

jest.mock("@kintone/rest-api-client", () => ({
  KintoneRestAPIClient: jest.fn().mockImplementation(() => ({
    record: {
      getRecords: jest
        .fn<() => Promise<{ records: KintoneRecord[] }>>()
        .mockResolvedValue({ records: [] }),
      addRecord: jest.fn<() => Promise<{ a?: string }>>().mockResolvedValue({}),
      updateRecord: jest
        .fn<() => Promise<{ a?: string }>>()
        .mockResolvedValue({}),
    },
  })),
}));

jest.mock("@ogrtk/shared-styles", () => ({}));

// jest.mock("@kintone/rest-api-client", () => ({
//   KintoneRestAPIClient: jest.fn().mockImplementation(() => ({
//     record: {
//       getRecords: jest.fn().mockImplementation(
//         // biome-ignore lint/suspicious/noExplicitAny: <explanation>
//         (): Promise<{ records: Array<Record<string, any>> }> =>
//           Promise.resolve({ records: [] }),
//       ),
//       addRecord: jest.fn().mockResolvedValue({}) as unknown as Promise<{
//         id: string;
//       }>, // 戻り値の型を明示
//       updateRecord: jest.fn().mockResolvedValue({}),
//     },
//   })),
// }));

// グローバル kintone オブジェクトのモック
// global.kintone = {
//   app: {
//     record: {
//       get: jest.fn(() => ({
//         record: {
//           qrCodeField: { value: "" },
//         },
//       })),
//       set: jest.fn(),
//     } ,
//     getId: jest.fn(() => 123),
//     getLookupTargetAppId: jest.fn(() => null),
//   },
// };
global.kintone.app.record.get = jest.fn(() => ({
  record: {
    qrCodeField: { value: "" },
  },
}));
global.kintone.app.record.set = jest.fn();
global.kintone.app.getId = jest.fn(() => 123);
global.kintone.app.getLookupTargetAppId = jest.fn(() => null);

describe("AppRecord Component", () => {
  const mockConfig: PluginConfig = {
    qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
    useCase: {
      types: ["listRegist", "listSearch", "listUpdate"],
      listRegist: {
        targetViewName: "listRegistView",
        noDuplicate: false,
        useAdditionalValues: false,
      },
      listUpdate: {
        targetViewName: "listUpdateView",
        additionalQuery: "",
        updateValues: [],
      },
      listSearch: { targetViewName: "listSearchView", additionalQuery: "" },
    },
  };

  test("QRコードをスキャンしてレコードを編集する", async () => {
    render(<AppRecord config={mockConfig} />);

    // QRコードスキャンボタンをクリック
    await userEvent.click(screen.getByTestId("qrreader-btn"));

    // kintone.app.record.set が適切に呼ばれるか確認
    await waitFor(() => {
      expect(global.kintone.app.record.set).toHaveBeenCalledTimes(1);
      const record = global.kintone.app.record.get();
      expect(record.record.qrCodeField.value).toBe("mock-qr-code-text");
    });
  });
});

describe("AppIndex Component", () => {
  const mockConfig: PluginConfig = {
    qrCode: { field: "qrCodeField", dataName: "QRコードの値" },
    useCase: {
      types: ["listRegist", "listSearch", "listUpdate"],
      listRegist: {
        targetViewName: "listRegistView",
        noDuplicate: false,
        useAdditionalValues: false,
      },
      listUpdate: {
        targetViewName: "listUpdateView",
        additionalQuery: "",
        updateValues: [],
      },
      listSearch: { targetViewName: "listSearchView", additionalQuery: "" },
    },
  };

  test.each([
    ["regist" as IndexMode, "mock-qr-code-text"],
    ["update" as IndexMode, "mock-qr-code-text"],
    ["search" as IndexMode, "mock-qr-code-text"],
  ])(
    "mode=%s のとき、対応する関数が呼ばれる",
    async (mode: IndexMode, qrText: string) => {
      const registSpy = jest
        .spyOn(require("./App"), "regist")
        .mockResolvedValue("regist");
      const updateSpy = jest
        .spyOn(require("./App"), "update")
        .mockResolvedValue("update");
      const searchSpy = jest
        .spyOn(require("./App"), "search")
        .mockResolvedValue("search");

      render(<AppIndex config={mockConfig} mode={mode as IndexMode} />);

      await userEvent.click(screen.getByTestId("qrreader-btn"));

      await waitFor(() => {
        if (mode === "regist") {
          expect(registSpy).toHaveBeenCalledWith(qrText, mockConfig);
        } else if (mode === "update") {
          expect(updateSpy).toHaveBeenCalledWith(qrText, mockConfig);
        } else if (mode === "search") {
          expect(searchSpy).toHaveBeenCalledWith(qrText, mockConfig);
        }
      });
    },
  );
});
