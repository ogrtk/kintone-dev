import {
  type KintoneRecordField,
  KintoneRestAPIClient,
} from "@kintone/rest-api-client";
import { T } from "vitest/dist/chunks/environment.d8YfPkTm.js";
import type { SafeParseReturnType, ZodSchema, z } from "zod";

/**
 * kintoneアプリのレコードを表す型
 */
export type KintoneRecord = {
  [fieldCode: string]: {
    value: unknown;
  };
};

/**
 * kintoneレコードURL取得（追加・編集・詳細画面に応じたURLを取得）
 * @param param
 * @returns
 */
export function getRecordUrl(param: RecordUrlParam): string {
  const common = `${location.origin}/k/${param.app}/`;

  switch (param.mode) {
    case "show":
      return `${common}show#record=${param.recordId}`;
    case "edit":
      return `${common}show#record=${param.recordId}&mode=edit`;
    case "add":
      return `${common}edit`;
  }
}
/** kintoneレコードURL取得のパラメータ（共通項目） */
type RecordUrlBase = {
  app: number;
};
/** kintoneレコードURL取得のパラメータ（詳細） */
type RecordUrlShow = RecordUrlBase & {
  mode: "show";
  recordId: string;
};
/** kintoneレコードURL取得のパラメータ（編集） */
type RecordUrlEdit = RecordUrlBase & {
  mode: "edit";
  recordId: string;
};
/** kintoneレコードURL取得のパラメータ（追加） */
type RecordUrlAdd = RecordUrlBase & {
  mode: "add";
};
/** kintoneレコードURL取得のパラメータ（詳細・編集・追加） */
type RecordUrlParam = RecordUrlShow | RecordUrlEdit | RecordUrlAdd;

/**
 * kintone項目の選択肢型
 */
export type SelectOption = { code: string; label: string };

/**
 * Kintone のフィールド型を表すリテラル型
 */
export type KintoneFieldTypeLiterals = KintoneRecordField.OneOf extends {
  type: infer T;
}
  ? T
  : never;

/**
 * kintoneのフィールド取得ユーティリティクラス
 */
export class KintoneFieldsRetriever {
  private client: KintoneRestAPIClient;
  private app: number;

  /**
   * コンストラクタ
   */
  constructor() {
    this.client = new KintoneRestAPIClient();
    const appId = kintone.app.getId();
    if (!appId) throw new Error("error");
    this.app = appId;
  }

  /**
   * スペース項目取得
   * @param noBlank 空白行なしとする（指定しない場合は空白行あり）
   * @returns
   */
  public getRecordSpaceFields = async (
    noBlank = false,
  ): Promise<SelectOption[]> => {
    const url = kintone.api.url("/k/v1/preview/form.json", true);
    const body = {
      app: this.app,
    };
    const formSettings = (await kintone.api(url, "GET", body)) as {
      properties: {
        elementId: string;
        type: string;
      }[];
    };
    const spacers = formSettings.properties
      .filter((property) => property.type === "SPACER")
      .map((property) => {
        return { code: property.elementId, label: property.elementId };
      });
    return this.addBlankIfNeeded(spacers, noBlank);
  };

  /**
   * １行テキスト項目取得
   * @param noBlank 空白行なしとする（指定しない場合は空白行あり）
   * @returns
   */
  public getSingleTextFields = async (
    noBlank = false,
  ): Promise<SelectOption[]> => {
    return await this.getFields(["SINGLE_LINE_TEXT"], noBlank);
  };

  /**
   * １行テキスト項目取得
   * @param noBlank 空白行なしとする（指定しない場合は空白行あり）
   * @returns
   */
  public getFields = async (
    fieldTypes: KintoneFieldTypeLiterals[],
    noBlank = false,
  ): Promise<SelectOption[]> => {
    const fields = await this.client.app.getFormFields({
      app: this.app,
      preview: true,
    });
    const extractedFields = Object.entries(fields.properties)
      .filter(([_key, value]) =>
        fieldTypes.includes(value.type as KintoneFieldTypeLiterals),
      )
      .map((entry) => {
        return { label: entry[1].label, code: entry[1].code };
      });
    return this.addBlankIfNeeded(extractedFields, noBlank);
  };

  /**
   * 一覧名取得
   * @param noBlank 空白行なしとする（指定しない場合は空白行あり）
   * @returns
   */
  public getViewNames = async (noBlank = false): Promise<SelectOption[]> => {
    const response = await this.client.app.getViews({
      app: this.app,
      preview: true,
    });
    const viewNames = Object.entries(response.views).map((entry) => {
      return { label: entry[1].name, code: entry[1].name };
    });
    return this.addBlankIfNeeded(viewNames, noBlank);
  };

  /**
   * 選択肢に空白行を追加する
   * @param list 選択肢
   * @param noBlank 空白行なしとする（指定しない場合は空白行あり）
   * @returns
   */
  private addBlankIfNeeded = (
    list: SelectOption[],
    noBlank: boolean,
  ): SelectOption[] => {
    // // 空白行なしの場合はそのまま返す
    if (noBlank) {
      return list;
    }
    // 空白行を追加
    return [{ code: "", label: "" }].concat(list);
  };
}

/**
 * プラグイン設定の保存
 * @param data
 * @param callback
 */
export function storePluginConfig<T>(data: T, callback: () => void) {
  const stringifiedData = { data: JSON.stringify(data) };
  kintone.plugin.app.setConfig(stringifiedData, callback);
}

/**
 * プラグイン設定の復元
 * @param data
 * @param callback
 */
export function restorePluginConfig<T extends ZodSchema>(
  id: string,
  schema: T,
): SafeParseReturnType<z.infer<T>, z.infer<T>> {
  const config = kintone.plugin.app.getConfig(id);
  return schema.safeParse(JSON.parse(config.data));
}
