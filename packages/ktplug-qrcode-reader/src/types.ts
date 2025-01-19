import i18next from "i18next";
import { z } from "zod";
import { zodI18nMap } from "zod-i18n-map";
// Import your language translation files
import translation from "zod-i18n-map/locales/ja/zod.json";
// lng and resources key depend on your locale.
i18next.init({
  lng: "ja",
  resources: {
    ja: { zod: translation },
  },
});
z.setErrorMap(zodI18nMap);

/**
 * kintoneアプリのレコードを表す型
 */
export type KintoneRecord = {
  [fieldCode: string]: {
    value: unknown;
  };
};

/**
 * 用途種別選択肢
 */
export const USECASE_TYPE_SELECTIONS = [
  { code: "listSearch", label: "一覧での検索" },
  { code: "listRegist", label: "一覧での登録" },
  { code: "listUpdate", label: "一覧での更新" },
  { code: "record", label: "詳細画面" },
];

// /**
//  *  0以上の整数スキーマ（preprocessにより入力文字列を数値とする）
//  */
// const geZeroIntSchema = z.preprocess((val) => {
//   if (typeof val === "number") {
//     return val;
//   }
//   return val ? Number(val) : undefined;
// }, z.number().int().min(0));

/**
 * 用途別設定スキーマ（一覧検索）
 */
const listSearchConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  additionalQuery: z.string().optional(),
});

/**
 * 用途別設定スキーマ（一覧登録）
 */
const listRegistConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  useAdditionalValues: z.boolean(),
  additionalValues: z
    .array(z.object({ field: z.string().nonempty(), value: z.any() }))
    .optional(),
});

/**
 * 用途別設定スキーマ（一覧更新）
 */
const listUpdateConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  additionalQuery: z.string().optional(),
  update: z.array(z.object({ field: z.string(), value: z.any() })),
});

/**
 * 用途別設定スキーマ（レコード）
 */
const recordConfigSchema = z.object({
  space: z.string(),
});

/**
 * 用途種別スキーマ
 */
const useCaseTypeSchema = z
  .literal("listSearch")
  .or(z.literal("listRegist"))
  .or(z.literal("listUpdate"))
  .or(z.literal("record"));

type UseCaseType = z.infer<typeof useCaseTypeSchema>;

/**
 * 用途種別設定スキーマ
 */
const useCaseSchema = z
  .object({
    types: z.array(useCaseTypeSchema).min(1),
    listSearch: listSearchConfigSchema.optional(),
    listRegist: listRegistConfigSchema.optional(),
    listUpdate: listUpdateConfigSchema.optional(),
    record: recordConfigSchema.optional(),
  })
  // 設定されている用途種別の設定があることをチェック
  .superRefine((data, ctx) => {
    for (const useCaseType of [
      "listSearch",
      "listRegist",
      "listUpdate",
      "record",
    ] as UseCaseType[]) {
      if (data.types.includes(useCaseType) && data[useCaseType] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `用途種別"${useCaseType}"の設定がありません`,
          path: [useCaseType],
        });
      }
    }
  });

/**
 * 読み取りデータ設定スキーマ
 */
const qrCodeConfigSchema = z.object({
  dataName: z.string().default("QRコードの値"),
  field: z.string().nonempty(),
});
export type QrCodeConfig = z.infer<typeof qrCodeConfigSchema>;

/**
 * カードリーダープラグインの設定情報スキーマ
 */
export const pluginConfigSchema = z.object({
  useCase: useCaseSchema,
  qrCode: qrCodeConfigSchema,
});

/**
 * カードリーダープラグインの設定情報
 */
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
