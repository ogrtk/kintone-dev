import "vitest";

interface CustomMatchers<R = unknown> {
  toBeFoo: () => R;
  toHaveClassStartingWith: (received: Element, expectedPrefix: string) => R;
  toBeTableWithRecords: (expectedRecords: unknown[][]) => R;
}

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
