import { KintoneRestAPIClient } from "@kintone/rest-api-client";

/**
 * 選択肢の型
 */
type SelectOption = { code: string; label: string };

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
    const fields = await this.client.app.getFormFields({
      app: this.app,
      preview: true,
    });
    const singleLineTextFields = Object.entries(fields.properties)
      .filter(([_key, value]) => value.type === "SINGLE_LINE_TEXT")
      .map((entry) => {
        return { label: entry[1].label, code: entry[1].code };
      });
    return this.addBlankIfNeeded(singleLineTextFields, noBlank);
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
