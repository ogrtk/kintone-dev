import { z } from "zod";

/**
 * オブジェクト型であるかを確認する型ガード
 * @param value 検証する値
 * @returns
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 指定されたキーを持つかを確認する型ガード
 * @param value 検証する値
 * @param key キー
 * @returns
 */
export function hasKey<T extends object, K extends PropertyKey>(
  value: T,
  key: K,
): value is T & Record<K, unknown> {
  return key in value;
}

/**
 * 指定されたリテラル型の配列か確認する型ガード
 * @param value 検証する値
 * @param literals リテラルの配列
 * @returns
 */
export function isLiteralsArray<T extends readonly string[]>(
  value: unknown,
  literals: T,
): value is T[number][] {
  // 配列であるか確認
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => literals.includes(item));
}

/**
 * 他項目に依存して、項目の値を削除するzod用preprocessの引数型
 * 条件項目(boolean型)と依存項目のオブジェクト
 */
export type FieldDependency<T extends Record<string, unknown>> = {
  conditionField: Extract<
    {
      [K in keyof T]: T[K] extends boolean ? K : never;
    }[keyof T],
    string
  >;
  dependentField: Extract<keyof T, string>;
};
/**
 * 他項目に依存して、項目の値を削除するzod用preprocess
 * 真偽値項目がfalseの場合に、対応して設定された項目値を削除する
 * @param fieldDependencies 条件項目と依存項目の配列
 * @returns
 */
export function unsetBoolDependentField<T extends Record<string, unknown>>(
  fieldDependencies: FieldDependency<T>[],
) {
  return (value: unknown) => {
    if (!isObject(value)) return value;

    for (const { conditionField, dependentField } of fieldDependencies) {
      if (!(value[conditionField] === true)) {
        value[dependentField] = undefined;
      }
    }
    return value;
  };
}

/**
 * 他項目に依存して、項目の値を削除するzod用preprocessの引数型
 * 配列項目中に値がない場合、その値をキーとする項目の値を削除する
 */
export type LiteralsField<T extends Record<string, unknown>> = Extract<
  {
    [K in keyof T]: T[K] extends Array<string> ? K : never;
  }[keyof T],
  string
>;
/**
 * 他項目に依存して、項目の値を削除するzod用preprocess
 * 与えられた一連のリテラル値について、指定の配列項目中に値がない場合、その値をキーとする項目の値を削除する
 * @param literalsField 配列項目のキー
 * @param literals リテラル値の配列
 * @returns
 */
export function unsetLiteralsDependentField<T extends Record<string, unknown>>(
  literalsField: LiteralsField<T>,
  literals: ReadonlyArray<string>,
) {
  return (value: unknown) => {
    if (!isObject(value) || !hasKey(value, literalsField)) {
      return value;
    }

    const literalsProp = value[literalsField];
    if (!isLiteralsArray(literalsProp, literals)) {
      return value;
    }

    for (const literal of literals) {
      if (!literalsProp.includes(literal)) {
        value[literal] = undefined;
      }
    }
    return value;
  };
}

/**
 * テキスト入力値を数値として扱うpreprocess
 * @param value
 * @returns
 */
export function textInputToNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  return value ? Number(value) : undefined;
}

export function refineJsonString(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 複数の preprocess を合成する関数
 */
export function combinePreprocesses(
  ...processors: ((value: unknown) => unknown)[]
) {
  return (value: unknown) =>
    processors.reduce((acc, processor) => processor(acc), value);
}

/**
 *  入力文字列を数値に変換するスキーマ（preprocessにより入力文字列を数値とする）
 */
export function preprocessedNumberInputSchema(schema: z.ZodNumber) {
  return z.preprocess((val) => {
    if (typeof val === "number") return val;
    if (typeof val === "string" && val.trim() !== "") {
      const num = Number(val);
      return Number.isNaN(num) ? undefined : num;
    }
    return undefined;
  }, schema);
}
