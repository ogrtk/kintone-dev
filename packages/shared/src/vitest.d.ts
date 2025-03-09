import "vitest";

interface CustomMatchers<R = unknown> {
  toHaveTableRecords: (expectedRecords: string[][]) => R;
  toHaveCheckedLabels: (checkedLabels: string[]) => R;
}

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
