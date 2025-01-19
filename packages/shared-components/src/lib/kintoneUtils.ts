import { KintoneRestAPIClient } from "@kintone/rest-api-client";

type SelectOption = { code: string; label: string };

export class KintoneFieldsRetriever {
  private client: KintoneRestAPIClient;
  private app: number;

  constructor() {
    this.client = new KintoneRestAPIClient();
    const appId = kintone.app.getId();
    if (!appId) throw new Error("error");
    this.app = appId;
  }

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
