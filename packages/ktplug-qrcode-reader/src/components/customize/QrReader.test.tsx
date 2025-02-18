import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import type { QrcodeErrorCallback, QrcodeSuccessCallback } from "html5-qrcode";
import { Html5QrcodeErrorTypes } from "html5-qrcode/esm/core";
import { type QrReadedAction, QrReader } from "./QrReader";

jest.mock("@ogrtk/shared-styles", () => ({}));

// コンポーネントに外部から与えるコールバック関数
const mockedAction = jest.fn() as QrReadedAction;

// コンポーネント内部で利用しているHtml5QrcodeScannerをモック化
const mockedClear = jest.fn();
const mockedRender = jest.fn();
jest.mock("html5-qrcode", () => ({
  Html5QrcodeScanner: jest.fn().mockImplementation(() => ({
    // render時、直ちにmockedRenderを実行する処理とする
    // ※テストケースによって、mockedRenderのモック実装を切り替える
    // 　表示だけのテスト・・・mockedRenderでは何もしない
    // 　読取のテスト・・・mockedRenderで、直ちにqrCodeSuccessCallbackを実行する（内部でmockedActionが実行される）
    // 　読取エラーのテスト・・・mockedRenderで、直ちにqrCodeErrorCallbackを実行する
    render: async (
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback: QrcodeErrorCallback | undefined,
    ) => {
      await mockedRender(qrCodeSuccessCallback, qrCodeErrorCallback);
    },
    clear: mockedClear,
  })),
}));

beforeEach(async () => {
  jest.clearAllMocks();
});

describe("QRコードリーダー", () => {
  test("QRコードリーダーを表示", async () => {
    /* arrange */
    mockedRender.mockImplementation(async () => {});

    render(
      <QrReader
        action={mockedAction}
        autoStart={false}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    /* action */
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );

    /* assert */
    await waitFor(
      () => {
        const messageEl = screen.getByRole("status");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent(
          "QRコードをカメラにかざしてください。",
        );
        const btnEl = screen.getByRole("button", { name: /読み取り停止/i });
        expect(btnEl).toBeInTheDocument();
        expect(mockedRender).toHaveBeenCalledTimes(1);
        expect(mockedAction).not.toHaveBeenCalled();
        expect(mockedClear).not.toHaveBeenCalled();

        const qrReaderEl = screen.getByRole("application", {
          name: "QRコードスキャナー",
        });
        expect(qrReaderEl).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  test("QRコードを正常に読取", async () => {
    /* arrange */
    mockedRender.mockImplementation(async (qrCodeSuccessCallback) => {
      const func = qrCodeSuccessCallback as QrcodeSuccessCallback;
      await func("mock-qr-code-text", {
        decodedText: "aa",
        result: { text: "bb" },
      });
    });

    render(
      <QrReader
        action={mockedAction}
        autoStart={false}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    /* action */
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );

    /* assert */
    await waitFor(
      () => {
        const messageEl = screen.getByRole("status");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent("読み取りに成功しました。");

        expect(mockedRender).toHaveBeenCalledTimes(1);

        expect(mockedAction).toHaveBeenCalledTimes(1);
        expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text");

        expect(mockedClear).toHaveBeenCalledTimes(1);

        const qrReaderEl = screen.queryByRole("application", {
          name: "QRコードスキャナー",
        });
        expect(qrReaderEl).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  test("QRコード読取時にエラー", async () => {
    /* arrange */
    mockedRender.mockImplementation(
      async (_qrCodeSuccessCallback, qrcodeErrorCallback) => {
        const func = qrcodeErrorCallback as QrcodeErrorCallback;
        await func("Error", {
          errorMessage: "errormessage",
          type: Html5QrcodeErrorTypes.UNKWOWN_ERROR,
        });
      },
    );

    render(
      <QrReader
        action={mockedAction}
        autoStart={false}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    /* action */
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );

    /* assert */
    await waitFor(
      () => {
        const messageEl = screen.getByRole("status");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent(
          "読み取りエラーが発生しました。(Error)",
        );
        expect(mockedAction).not.toHaveBeenCalled();
        expect(mockedRender).toHaveBeenCalledTimes(1);
        expect(mockedClear).not.toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  test("QRコードリーダーを表示後に停止", async () => {
    /* arrange */
    mockedRender.mockImplementation(async () => {});
    render(
      <QrReader
        action={mockedAction}
        autoStart={false}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    /* action */
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り停止/i }),
    );

    /* assert */
    await waitFor(
      () => {
        const messageEl = screen.getByRole("status");
        expect(messageEl).toBeInTheDocument();
        expect(messageEl).toHaveTextContent("");

        const btnEl = screen.getByRole("button", { name: /読み取り開始/i });
        expect(btnEl).toBeInTheDocument();

        expect(mockedAction).not.toHaveBeenCalled();
        expect(mockedRender).toHaveBeenCalledTimes(1);
        expect(mockedClear).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  test("Autostart:true", async () => {
    /* arrange */
    mockedRender.mockImplementation(async () => {});

    render(
      <QrReader
        action={mockedAction}
        autoStart={true}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    /* action */

    /* assert */
    await waitFor(
      () => {
        const messageEl = screen.getByRole("status");
        expect(messageEl).toHaveTextContent(
          "QRコードをカメラにかざしてください。",
        );
        const btnEl = screen.getByRole("button", { name: /読み取り停止/i });
        expect(mockedRender).toHaveBeenCalledTimes(1);
        expect(mockedAction).not.toHaveBeenCalled();
        expect(mockedClear).not.toHaveBeenCalled();

        const qrReaderEl = screen.getByRole("application", {
          name: "QRコードスキャナー",
        });
        expect(qrReaderEl).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  test("QRコードを連続で読み取れる", async () => {
    mockedRender.mockImplementation(async (qrCodeSuccessCallback) => {
      const func = qrCodeSuccessCallback as QrcodeSuccessCallback;
      await func("mock-qr-code-text-1", {
        decodedText: "aa",
        result: { text: "bb" },
      });
    });

    render(
      <QrReader
        action={mockedAction}
        autoStart={false}
        size={{ height: "100px", width: "100px" }}
      />,
    );

    // 1回目の読み取り
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );
    await waitFor(() => {
      expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text-1");
      expect(mockedClear).toHaveBeenCalledTimes(1);
    });

    // 2回目の読み取り
    mockedRender.mockImplementation(async (qrCodeSuccessCallback) => {
      const func = qrCodeSuccessCallback as QrcodeSuccessCallback;
      await func("mock-qr-code-text-2", {
        decodedText: "aa",
        result: { text: "bb" },
      });
    });
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /読み取り開始/i },
        { timeout: 2000 },
      ),
    );
    await waitFor(() =>
      expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text-2"),
    );
  });
});
