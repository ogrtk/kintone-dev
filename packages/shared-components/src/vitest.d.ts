import "vitest";

interface CustomMatchers<R = unknown> {
  toBeTableWithRecords: (expectedRecords: string[][]) => R;
}

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
