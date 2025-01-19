import type { ZodSchema, z } from "zod";

export function hexToAscii(hexString: string): string {
  // スペースを削除して16進数の文字列を連結
  const cleanHexString = hexString.replace(/\s+/g, "");

  // 16進数を2文字ずつ分割してASCII文字に変換
  let asciiString = "";
  for (let i = 0; i < cleanHexString.length; i += 2) {
    const hexPair = cleanHexString.slice(i, i + 2); // 2文字を切り出し
    const asciiChar = String.fromCharCode(Number.parseInt(hexPair, 16)); // 16進数→10進数→ASCII文字
    asciiString += asciiChar;
  }

  return asciiString;
}

export const storeStorage = <T>(data: T, callback: () => void) => {
  const stringifiedData = { data: JSON.stringify(data) };
  kintone.plugin.app.setConfig(stringifiedData, callback);
};

export function restoreStorage<T extends ZodSchema>(
  id: string,
  schema: T,
): z.infer<typeof schema> {
  const config = kintone.plugin.app.getConfig(id);
  return config.data
    ? schema.safeParse(JSON.parse(config.data)).data
    : undefined;
}
