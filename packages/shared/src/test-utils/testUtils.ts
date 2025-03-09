import { vi } from "vitest";

export async function spyUnhandledRejection(
  test: (spy: ReturnType<typeof vi.fn>) => Promise<void>,
) {
  // 例外メッセージを補足するspyを設定
  const unhandledRejectionSpy = vi.fn();
  const originalHandler = process.listeners("unhandledRejection")[0];
  process.removeAllListeners("unhandledRejection");
  process.on("unhandledRejection", unhandledRejectionSpy);

  // テスト実行
  await test(unhandledRejectionSpy);

  // 元のリスナーを復元
  process.removeAllListeners("unhandledRejection");
  if (originalHandler) {
    process.on("unhandledRejection", originalHandler);
  }
}
