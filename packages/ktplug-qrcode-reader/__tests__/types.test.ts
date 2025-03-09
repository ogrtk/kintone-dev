import { fail } from "node:assert";
import { type PluginConfig, pluginConfigSchema } from "@/src/types";
import { describe, expect, test } from "vitest";
import { z } from "zod";

describe("pluginConfigSchema ✅ 正常系", () => {
  //
  test("listSearch のみの設定が有効", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listSearch"],
        listSearch: {
          targetViewName: "ビューA",
          additionalQuery: "ステータス = '有効'",
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });

  test("listRegist のみの設定が有効", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "ビューB",
          noDuplicate: true,
          useAdditionalValues: false,
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });

  test("listRegist のみの設定が有効(useAdditionalValues)", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "ビューB",
          noDuplicate: true,
          useAdditionalValues: true,
          additionalValues: [{ field: "field1", value: `{"value":"value1"}` }],
          duplicateCheckAdditionalQuery: "additional query",
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });

  test("listUpdate のみの設定が有効", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "ビューC",
          updateValues: [{ field: "フィールドD", value: "{}" }],
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });

  test("record のみの設定が有効", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["record"],
        record: { space: "スペースA" },
      },
      qrCode: { field: "qrField", dataName: "QRコードの値" },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });

  test("listSearch, listRegist, listUpdate, record のすべてを設定しても有効（異なる targetViewName）", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listSearch", "listRegist", "listUpdate", "record"],
        listSearch: { targetViewName: "ビューA" },
        listRegist: {
          targetViewName: "ビューB",
          noDuplicate: false,
          useAdditionalValues: false,
        },
        listUpdate: {
          targetViewName: "ビューC",
          updateValues: [{ field: "フィールドD", value: "{}" }],
        },
        record: { space: "スペースA" },
      },
      qrCode: { dataName: "QRコードの値", field: "qrField" },
    };
    expect(() => pluginConfigSchema.parse(config)).not.toThrow();
  });
});

describe("pluginConfigSchema ❌ 異常系", () => {
  test("types が空の場合はエラー", () => {
    const config = { useCase: { types: [] }, qrCode: { field: "qrField" } };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "too_small",
          message: "1個以上の要素が必要です。",
          minimum: 1,
          type: "array",
          inclusive: true,
          path: ["useCase", "types"],
        },
      ]);
    }
  });

  test("listSearch: typesに指定・設定無し", () => {
    const config = {
      useCase: { types: ["listSearch"] },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: '用途種別"listSearch"の設定がありません',
          path: ["useCase", "listSearch"],
        },
      ]);
    }
  });

  test("listSearch: 必須設定項目無し", () => {
    const config = {
      useCase: { types: ["listSearch"], listSearch: {} },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "invalid_type",
          message: "必須",
          path: ["useCase", "listSearch", "targetViewName"],
        },
      ]);
    }
  });

  test("listUpdate: typesに指定・設定無し", () => {
    const config = {
      useCase: { types: ["listUpdate"] },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: '用途種別"listUpdate"の設定がありません',
          path: ["useCase", "listUpdate"],
        },
      ]);
    }
  });

  test("listUpdate: 必須設定項目無し", () => {
    const config = {
      useCase: { types: ["listUpdate"], listUpdate: {} },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "invalid_type",
          message: "必須",
          path: ["useCase", "listUpdate", "targetViewName"],
        },
        {
          code: "invalid_type",
          message: "必須",
          path: ["useCase", "listUpdate", "updateValues"],
        },
      ]);
    }
  });

  test("listUpdate: updateValuesのvalueがjson形式外", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "ビューB",
          updateValues: [{ field: "field1", value: `"value":"value1a"` }],
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: expect.stringContaining("JSON形式の文字列としてください。"),
          path: ["useCase", "listUpdate", "updateValues", 0, "value"],
        },
      ]);
    }
  });

  test("listRegist: typesに指定あり・設定無し", () => {
    const config = {
      useCase: { types: ["listRegist"] },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: '用途種別"listRegist"の設定がありません',
          path: ["useCase", "listRegist"],
        },
      ]);
    }
  });

  test("listRegist: 必須設定項目無し", () => {
    const config = {
      useCase: {
        types: ["listRegist"],
        listRegist: {},
      },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "invalid_type",
          expected: "string",
          message: "必須",
          path: ["useCase", "listRegist", "targetViewName"],
          received: "undefined",
        },
        {
          code: "invalid_type",
          expected: "boolean",
          message: "必須",
          path: ["useCase", "listRegist", "noDuplicate"],
          received: "undefined",
        },
        {
          code: "invalid_type",
          expected: "boolean",
          message: "必須",
          path: ["useCase", "listRegist", "useAdditionalValues"],
          received: "undefined",
        },
      ]);
    }
  });

  test("listRegist: useAdditionalValues が true、additionalValues の 要素無し", () => {
    const config = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "ビューA",
          noDuplicate: true,
          useAdditionalValues: true,
          additionalValues: [],
        },
      },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "too_small",
          message: "1個以上の要素が必要です。",
          path: ["useCase", "listRegist", "additionalValues"],
        },
      ]);
    }
  });

  test("listRegist: additionalValuesのvalueがjson形式外", () => {
    const config: PluginConfig = {
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "ビューB",
          noDuplicate: true,
          useAdditionalValues: true,
          additionalValues: [{ field: "field1", value: `"value":"value1a"` }],
          duplicateCheckAdditionalQuery: "additional query",
        },
      },
      qrCode: {
        dataName: "QRコードの値",
        field: "qrField",
      },
    };
    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: expect.stringContaining("JSON形式の文字列としてください。"),
          path: ["useCase", "listRegist", "additionalValues", 0, "value"],
        },
      ]);
    }
  });

  test("record: types指定あり・設定無し", () => {
    const config = {
      useCase: { types: ["record"] },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: '用途種別"record"の設定がありません',
          path: ["useCase", "record"],
        },
      ]);
    }
  });

  test("record: 必須設定項目無し", () => {
    const config = {
      useCase: { types: ["record"], record: {} },
      qrCode: { field: "qrField" },
    };

    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "invalid_type",
          message: "必須",
          path: ["useCase", "record", "space"],
        },
      ]);
    }
  });

  test("listRegist と listSearch の targetViewName が同じ", () => {
    const config = {
      useCase: {
        types: ["listRegist", "listSearch"],
        listRegist: {
          targetViewName: "ビューA",
          noDuplicate: false,
          useAdditionalValues: false,
        },
        listSearch: { targetViewName: "ビューA" },
      },
      qrCode: { field: "qrField" },
    };
    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "custom",
          message: "別々の一覧を設定してください。",
          path: ["useCase", "listRegist", "targetViewName"],
        },
        {
          code: "custom",
          message: "別々の一覧を設定してください。",
          path: ["useCase", "listSearch", "targetViewName"],
        },
      ]);
    }
  });

  test("qrCode: 必須設定項目無し", () => {
    const config = {
      useCase: {
        types: ["listSearch"],
        listSearch: { targetViewName: "ビューA" },
      },
      qrCode: {},
    };
    try {
      pluginConfigSchema.parse(config);
      fail("例外の発生を期待しますが、発生しませんでした。");
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).errors).toMatchObject([
        {
          code: "invalid_type",
          message: "必須",
          path: ["qrCode", "field"],
        },
      ]);
    }
  });
});
