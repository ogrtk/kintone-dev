// import { z } from "zod";
// import type { PluginConfig } from "../types";

// // 型制約付き関数
// function validateWithSpecificSchema<T, S extends z.ZodTypeAny>(
//   data: T,
//   schema: S & z.ZodType<T>, // z.ZodObject に制約を追加
// ): { success: true; data: z.infer<S> } | { success: false; error: string } {
//   const result = schema.safeParse(data);
//   if (result.success) {
//     return { success: true, data: result.data };
//   }
//   return { success: false, error: result.error.message };
// }

// // 使用例
// const userSchema = z.object({
//   name: z.string(),
//   age: z.number(),
// });

// const data = { name: "Alice", age: 25 };

// // 正常なスキーマは許可される
// const result = validateWithSpecificSchema(data, userSchema);
// console.log(result);

// // 誤った型のスキーマはコンパイルエラー
// // const invalidSchema = z.string(); // エラー：スキーマは z.ZodObject を期待
// // validateWithSpecificSchema(invalidSchema, "Invalid");
