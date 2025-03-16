import { afterEach } from "node:test";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";
import {
  AppRenderError,
  AppRenderErrorAsync,
  CompRenderError,
  CompRenderErrorAsync,
  UseEffectError,
  UseEffectErrorAsync,
  UseEffectErrorAsyncParent,
  UseEffectErrorAsyncWrapped,
  throwError,
  throwErrorAsync,
} from "./sample";
import { UseEffectErrorAsyncChild } from "./sampleChild";

let unhandledRejectionSpy: Mock;
let originalHandler: NodeJS.UnhandledRejectionListener;
// プラグインの設定をモック
vi.mock("./sampleChild", async () => {
  const actual =
    await vi.importActual<typeof import("./sampleChild")>("./sampleChild");
  return {
    ...actual,
    UseEffectErrorAsyncChild: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();

  unhandledRejectionSpy = vi.fn();
  originalHandler = process.listeners("unhandledRejection")[0];
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", unhandledRejectionSpy);
});

afterEach(() => {
  process.removeAllListeners("unhandledRejection");
  if (originalHandler) {
    process.on("unhandledRejection", originalHandler);
  }
});

describe("sample", () => {
  test("例外をスローする同期関数", async () => {
    /* assert */
    expect(() => throwError()).toThrow("throw error");
  });

  test("例外をスローする非同期関数", async () => {
    /* assert */
    await expect(() => throwErrorAsync()).rejects.toThrow(
      "throw error asyncronously",
    );
  });

  test("レンダリング時の同期処理エラー", async () => {
    /* assert */
    expect(() => render(<CompRenderError />)).toThrow("throw error");
  });

  test("レンダリング時の非同期処理エラー", async () => {
    const spy = vi.fn();
    const originalHandler = process.listeners("unhandledRejection")[0];
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", spy);

    render(<CompRenderErrorAsync />);

    // 非同期エラーの発生を待つ
    await waitFor(() => {
      expect((spy.mock.calls[0][0] as Error).message).toEqual(
        "throw error asyncronously",
      );
    });

    // 元のリスナーを復元
    process.removeAllListeners("unhandledRejection");
    if (originalHandler) {
      process.on("unhandledRejection", originalHandler);
    }

    // spyUnhandledRejection(async (spy) => {
    //   render(<CompRenderErrorAsync />);

    //   // 非同期エラーの発生を待つ
    //   await waitFor(() => {
    //     console.log((spy.mock.calls[0][0] as Error).message);
    //     expect((spy.mock.calls[0][0] as Error).message).toEqual(
    //       "throw error asyncronously!!!",
    //     );
    //   });
    // });
  });

  test("レンダリング時の同期処理エラーをErrorboundaryで捕捉", async () => {
    await suppressNoisyError(() => {
      render(<AppRenderError />);
      expect(screen.getByText("throw error")).toBeInTheDocument();
    });
  });

  test("レンダリング時の非同期処理エラーをErrorboundaryで捕捉（Suspenseを使用）", async () => {
    await suppressNoisyError(async () => {
      render(<AppRenderErrorAsync />);
      await waitFor(() => {
        expect(
          screen.getByText("throw error asyncronously"),
        ).toBeInTheDocument();
      });
    });
  });

  test("useEffectの同期処理でエラー", async () => {
    /* assert */
    expect(() => render(<UseEffectError />)).toThrow("throw error");
  });

  test("useEffectの非同期処理でエラー", async () => {
    render(<UseEffectErrorAsync />);

    // 非同期エラーの発生を待つ
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "throw error asyncronously",
      );
    });
  });

  test("useEffectの非同期処理でエラー（IIFE）", async () => {
    render(<UseEffectErrorAsyncWrapped />);
    // 非同期エラーの発生を待つ
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "throw error asyncronously",
      );
    });
  });

  test("子コンポーネントに渡した処理で、子コンポーネントのuseEffectからエラー発生", async () => {
    (UseEffectErrorAsyncChild as Mock).mockImplementation(
      ({ func }: { func: (arg: string) => Promise<void> }) => {
        useEffect(() => {
          func("mocked message");
        }, [func]);
        return <div>sample child</div>;
      },
    );

    render(<UseEffectErrorAsyncParent />);

    // 非同期エラーの発生を待つ
    await waitFor(() => {
      expect((unhandledRejectionSpy.mock.calls[0][0] as Error).message).toBe(
        "mocked message",
      );
    });
  });
});

async function suppressNoisyError(testCase: () => void | Promise<void>) {
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  await testCase();

  consoleErrorSpy.mockRestore();
}

async function spyUnhandledRejection(
  test: (spy: ReturnType<typeof vi.fn>) => Promise<void>,
) {
  // 例外メッセージを補足するspyを設定
  const unhandledRejectionSpy = vi.fn();
  const originalHandler = process.listeners("unhandledRejection")[0];
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", unhandledRejectionSpy);

  // テスト実行
  test(unhandledRejectionSpy);

  // 元のリスナーを復元
  process.removeAllListeners("unhandledRejection");
  if (originalHandler) {
    process.on("unhandledRejection", originalHandler);
  }
}
