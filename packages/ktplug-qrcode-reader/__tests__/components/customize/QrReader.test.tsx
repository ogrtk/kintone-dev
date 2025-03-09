import {
  type QrReadedAction,
  QrReader,
} from "@/src/components/customize/QrReader";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QrcodeErrorCallback, QrcodeSuccessCallback } from "html5-qrcode";
import { Html5QrcodeErrorTypes } from "html5-qrcode/esm/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// vi.mock("@ogrtk/shared/styles", () => ({}));

// コンポーネントに外部から与えるコールバック関数
const mockedAction = vi.fn() as QrReadedAction;

// コンポーネント内部で利用しているHtml5QrcodeScannerをモック化
const mockedClear = vi.fn();
const mockedRender = vi.fn();
vi.mock("html5-qrcode", () => ({
  Html5QrcodeScanner: vi.fn().mockImplementation(() => ({
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
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
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
        expect(mockedRender).toHaveBeenCalledOnce();
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

        expect(mockedRender).toHaveBeenCalledOnce();

        expect(mockedAction).toHaveBeenCalledOnce();
        expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text");

        expect(mockedClear).toHaveBeenCalledOnce();

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
        expect(mockedAction).not.toHaveBeenCalled();
        expect(mockedRender).toHaveBeenCalledOnce();
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
        expect(mockedRender).toHaveBeenCalledOnce();
        expect(mockedClear).toHaveBeenCalledOnce();
      },
      { timeout: 2000 },
    );
  });

  test("QRコードリーダーを表示後に停止(一度エラー発生)", async () => {
    /* arrange */
    const warnSpy = vi.spyOn(console, "warn");
    mockedRender.mockImplementation(async () => {});
    mockedClear.mockImplementationOnce(async () => {
      throw new Error("error once");
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
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り停止/i }),
    );

    /* assert */
    await waitFor(
      () => {
        expect(mockedClear).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledWith("retry clearing");
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
        expect(mockedRender).toHaveBeenCalledOnce();
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
    /* arrange */
    // 1回目の読み取り
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

    /* action */
    await userEvent.click(
      screen.getByRole("button", { name: /読み取り開始/i }),
    );
    /* assert */
    await waitFor(() => {
      expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text-1");
      expect(mockedClear).toHaveBeenCalledOnce();
    });

    /* arrange */
    // 2回目の読み取り
    mockedRender.mockImplementation(async (qrCodeSuccessCallback) => {
      const func = qrCodeSuccessCallback as QrcodeSuccessCallback;
      await func("mock-qr-code-text-2", {
        decodedText: "aa",
        result: { text: "bb" },
      });
    });
    /* action */
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /読み取り開始/i },
        { timeout: 2000 },
      ),
    );
    /* assert */
    await waitFor(() =>
      expect(mockedAction).toHaveBeenCalledWith("mock-qr-code-text-2"),
    );
  });

  // test("clearReader で scannerRef.current が undefined の場合に早期 return する", async () => {
  //   const actionMock = vi.fn();
  //   const { container } = render(
  //     <QrReader
  //       size={{ width: "200px", height: "200px" }}
  //       action={actionMock}
  //       autoStart={false}
  //     />,
  //   );

  //   // QrReader のインスタンスを取得
  //   // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  //   const instance = container.firstChild as any;
  //   console.log("🚀 ~ test ~ instance:", instance);

  //   // scannerRef.current を undefined にする
  //   instance.scannerRef = { current: null };

  //   // clearReader を直接実行
  //   await act(async () => {
  //     await instance.clearReader();
  //   });

  //   // 何も処理されずに return されるので、副作用がないことを確認
  //   expect(screen.getByRole("application")).toHaveStyle("display: none");
  // });
});
