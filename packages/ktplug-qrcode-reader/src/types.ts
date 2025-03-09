import {
  refineJsonString,
  unsetBoolDependentField,
  unsetLiteralsDependentField,
  z,
} from "@ogrtk/shared/zod-utils";

/**
 * 用途種別選択肢
 */
export const USECASE_TYPE_SELECTIONS = [
  { code: "listSearch", label: "一覧での検索" },
  { code: "listRegist", label: "一覧での登録" },
  { code: "listUpdate", label: "一覧での更新" },
  { code: "record", label: "詳細画面" },
] as const;

/**
 * レコード編集設定のスキーマ
 */
const recordEditSchema = z
  .array(
    z.object({
      field: z.string().nonempty(),
      value: z
        .string()
        .refine(refineJsonString, "JSON形式の文字列としてください。"),
    }),
  )
  .min(1);

/**
 * 用途種別の設定スキーマ（一覧検索）
 */
const listSearchConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  additionalQuery: z.string().optional(),
});

/**
 * 用途種別の設定スキーマ（一覧登録）
 * preprocess無しの型表現
 */
const listRegistConfigSchemaCore = z.object({
  targetViewName: z.string().nonempty(),
  noDuplicate: z.boolean(),
  duplicateCheckAdditionalQuery: z.string().optional(),
  useAdditionalValues: z.boolean(),
  additionalValues: recordEditSchema.optional(),
});
type ListRegistConfigCore = z.infer<typeof listRegistConfigSchemaCore>;

/**
 * 用途種別の設定スキーマ（一覧登録）
 */
const listRegistConfigSchema = z.preprocess(
  unsetBoolDependentField<ListRegistConfigCore>([
    {
      conditionField: "useAdditionalValues",
      dependentField: "additionalValues",
    },
    {
      conditionField: "noDuplicate",
      dependentField: "duplicateCheckAdditionalQuery",
    },
  ]),
  listRegistConfigSchemaCore,
);
export type ListRegistConfig = z.infer<typeof listRegistConfigSchema>;

/**
 * 用途種別の設定スキーマ（一覧更新）
 */
const listUpdateConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  additionalQuery: z.string().optional(),
  updateValues: recordEditSchema,
});

/**
 * 用途種別の設定スキーマ（レコード）
 */
const recordConfigSchema = z.object({
  space: z.string(),
});

/**
 * 用途種別スキーマ
 */
const useCaseTypes = USECASE_TYPE_SELECTIONS.map(({ code }) => code) as [
  (typeof USECASE_TYPE_SELECTIONS)[number]["code"],
  ...(typeof USECASE_TYPE_SELECTIONS)[number]["code"][],
];
const useCaseTypeSchema = z.enum(useCaseTypes);

/**
 * 異なる対象一覧が設定されていることを確認するバリデーション
 * @param value
 * @returns
 */
function validateDifferentTargets(
  ctx: z.RefinementCtx,
  typeA: "listRegist" | "listSearch" | "listUpdate",
  typeB: "listRegist" | "listSearch" | "listUpdate",
  data: UseCase,
) {
  if (
    data.types.includes(typeA) &&
    data.types.includes(typeB) &&
    data[typeA]?.targetViewName === data[typeB]?.targetViewName
  ) {
    const msg = "別々の一覧を設定してください。";
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: msg,
      path: [typeA, "targetViewName"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: msg,
      path: [typeB, "targetViewName"],
    });
  }
}

/**
 * 用途種別の設定スキーマ
 * preprocess無しの型表現
 */
const useCaseSchemaCore = z.object({
  types: z.array(useCaseTypeSchema).min(1),
  listSearch: listSearchConfigSchema.optional(),
  listRegist: listRegistConfigSchema.optional(),
  listUpdate: listUpdateConfigSchema.optional(),
  record: recordConfigSchema.optional(),
});
type UseCaseCore = z.infer<typeof useCaseSchemaCore>;

/**
 * 用途種別の設定スキーマ
 */
const useCaseSchema = z.preprocess(
  unsetLiteralsDependentField<UseCaseCore>("types", useCaseTypes),
  useCaseSchemaCore
    // 設定されている用途種別の設定があることをチェック
    .superRefine((data, ctx) => {
      for (const useCaseType of useCaseTypes) {
        if (
          data.types.includes(useCaseType) &&
          data[useCaseType] === undefined
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `用途種別"${useCaseType}"の設定がありません`,
            path: [useCaseType],
          });
        }
      }

      // 検索・登録・更新の一覧で、同じ一覧が指定されていないこと
      validateDifferentTargets(ctx, "listRegist", "listSearch", data);
      validateDifferentTargets(ctx, "listRegist", "listUpdate", data);
      validateDifferentTargets(ctx, "listSearch", "listUpdate", data);
    }),
);
type UseCase = z.infer<typeof useCaseSchema>;

/**
 * 読み取りデータ設定スキーマ
 */
const qrCodeConfigSchema = z.object({
  dataName: z.string().default("QRコードの値"),
  field: z.string().nonempty(),
});
// type QrCodeConfig = z.infer<typeof qrCodeConfigSchema>;

/**
 * プラグインの設定情報スキーマ
 */
export const pluginConfigSchema = z.object({
  useCase: useCaseSchema,
  qrCode: qrCodeConfigSchema,
});
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
