/**
 * kintoneアプリのレコードを表す型
 */
export type KintoneRecord = {
  [fieldCode: string]: {
    value: unknown;
  };
};
