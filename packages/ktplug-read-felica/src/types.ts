import {
  preprocessedNumberInputSchema,
  refineJsonString,
  unsetBoolDependentField,
  unsetLiteralsDependentField,
  z,
} from "@ogrtk/shared/zod-utils";

/**
 *  0以上の整数スキーマ（preprocessにより入力文字列を数値とする）
 */
const geZeroIntSchema = preprocessedNumberInputSchema(z.number().int().min(0));

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
 * 用途設定スキーマ（一覧での登録）
 * preprocess無しの型表現
 */
const listRegistConfigCoreSchema = z.object({
  targetViewName: z.string().nonempty(),
  noDuplicate: z.boolean(),
  duplicateCheckAdditionalQuery: z.string().optional(),
  useAdditionalValues: z.boolean(),
  additionalValues: recordEditSchema.optional(),
  confirmBefore: z.boolean(),
  notifyAfter: z.boolean(),
});
type ListRegistConfigCore = z.infer<typeof listRegistConfigCoreSchema>;

/**
 * 用途設定スキーマ（一覧での登録）
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
  listRegistConfigCoreSchema,
);

/**
 * 用途設定スキーマ（一覧での更新）
 */
const listUpdateConfigSchema = z.object({
  targetViewName: z.string().nonempty(),
  additionalQuery: z.string().optional(),
  updateValues: recordEditSchema,
  confirmBefore: z.boolean(),
  notifyAfter: z.boolean(),
});

/**
 * 用途設定スキーマ(詳細画面)
 */
const recordConfigSchema = z.object({
  targetSpacer: z.string().nonempty(),
});

/**
 * 異なる対象一覧が設定されていることを確認するバリデーション
 * @param value
 * @returns
 */
function validateDifferentTargets(
  ctx: z.RefinementCtx,
  typeA: "listRegist" | "listUpdate",
  typeB: "listRegist" | "listUpdate",
  data: UseCaseCore,
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
 *  利用用途種別の選択肢
 */
export const USECASE_TYPE_SELECTIONS = [
  { code: "listRegist", label: "一覧での登録" },
  { code: "listUpdate", label: "一覧での更新" },
  { code: "record", label: "詳細画面" },
] as const;

/**
 * 用途種別スキーマ
 */
const useCaseTypes = USECASE_TYPE_SELECTIONS.map(({ code }) => code) as [
  (typeof USECASE_TYPE_SELECTIONS)[number]["code"],
  ...(typeof USECASE_TYPE_SELECTIONS)[number]["code"][],
];
const useCaseTypeSchema = z.enum(useCaseTypes);

/**
 * 用途種別設定スキーマ
 * preprocess無しの型表現
 */
const useCaseCoreSchema = z.object({
  types: z.array(useCaseTypeSchema).min(1),
  listRegist: listRegistConfigSchema.optional(),
  listUpdate: listUpdateConfigSchema.optional(),
  record: recordConfigSchema.optional(),
});
type UseCaseCore = z.infer<typeof useCaseCoreSchema>;

/**
 * 用途種別設定スキーマ
 */
const useCaseSchema = z.preprocess(
  unsetLiteralsDependentField<UseCaseCore>("types", useCaseTypes),
  useCaseCoreSchema // 設定されている用途種別の設定があることをチェック
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

      // 登録・更新の一覧で、同じ一覧が指定されていないこと
      validateDifferentTargets(ctx, "listRegist", "listUpdate", data);
    }),
);
type UseCase = z.infer<typeof useCaseSchema>;

/**
 * IDm読み取り設定スキーマ
 */
const idmReadConfigSchema = z.object({
  fieldCd1: z.string().nonempty(),
  fieldCd2: z.string().optional(),
});
export type IdmReadConfig = z.infer<typeof idmReadConfigSchema>;

/**
 * メモリ読み取り設定スキーマ
 */
const memoryReadConfigSchema = z.object({
  name: z.string().default("読取データ"),
  serviceCode: z
    .string()
    .length(4)
    .regex(/^[1234567890ABCDEF]{4}$/),
  block: z.object({
    start: geZeroIntSchema,
    end: geZeroIntSchema,
  }),
  slice: z.object({
    start: geZeroIntSchema,
    end: geZeroIntSchema.optional(),
  }),
  fieldCd1: z.string().nonempty(),
  fieldCd2: z.string().optional(),
});
export type MemoryReadConfig = z.infer<typeof memoryReadConfigSchema>;

/**
 *  読取設定種別の選択肢
 */
export const READ_TYPE_SELECTIONS = [
  { code: "idm", label: "IDmのみ" },
  { code: "memory", label: "メモリのみ" },
  { code: "both", label: "両方" },
] as const;

/**
 * 読取設定種別スキーマ
 */
const readTypes = READ_TYPE_SELECTIONS.map(({ code }) => code) as [
  (typeof READ_TYPE_SELECTIONS)[number]["code"],
  ...(typeof READ_TYPE_SELECTIONS)[number]["code"][],
];
const readTypeSchema = z.enum(readTypes);
export type ReadType = z.infer<typeof readTypeSchema>;

/**
 * 読み取り設定スキーマ
 * readTypeによって設定項目を切り替え(discriminatedUnion)
 */
const readConfigSchema = z.discriminatedUnion("readType", [
  // z.object({
  //   readType: z.literal(""),
  // }),
  z.object({
    readType: z.literal("idm"),
    idm: idmReadConfigSchema,
  }),
  z.object({
    readType: z.literal("memory"),
    memory: memoryReadConfigSchema,
  }),
  z.object({
    readType: z.literal("both"),
    idm: idmReadConfigSchema,
    memory: memoryReadConfigSchema,
    uniqueItem: z.union([z.literal("idm"), z.literal("memory")]),
  }),
]);

/**
 * カードリーダープラグインの設定情報スキーマ
 */
export const pluginConfigSchema = z.object({
  useCase: useCaseSchema,
  readConfig: readConfigSchema,
});

/**
 * カードリーダープラグインの設定情報
 */
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
