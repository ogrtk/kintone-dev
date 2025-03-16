import type { PluginConfig } from "@/src/types";
import {
  type KintoneRecordField,
  KintoneRestAPIClient,
} from "@kintone/rest-api-client";
import { type KintoneRecord, getRecordUrl } from "@ogrtk/shared/kintone-utils";
import { type QrReadedAction, QrReader } from "./QrReader";

/**
 * レコード用カスタマイズコンポーネント
 * @param param0.config プラグインの設定データ
 * @returns
 */
export function AppRecord({ config }: { config: PluginConfig }) {
  /**
   * レコード編集処理
   * @param data 編集値
   * @param fieldCode 編集先のフィールドコード1
   */
  const editRecord = (data: string, fieldCode: string) => {
    const record = kintone.app.record.get();
    record.record[fieldCode].value = data;
    // ルックアップ項目の場合、参照先アプリから情報取得
    if (kintone.app.getLookupTargetAppId(fieldCode) !== null) {
      record.record[fieldCode].lookup = true;
    }
    // 表示中のデータに反映
    kintone.app.record.set(record);
  };

  return (
    <div style={{ margin: "8px" }}>
      <QrReader
        size={{ height: "500px", width: "500px" }}
        action={(decodedText: string) => {
          editRecord(decodedText, config.qrCode.field);
        }}
        autoStart={false}
      />
    </div>
  );
}

/**
 * 一覧の処理モード
 */
export type IndexMode = "regist" | "update" | "search";

/**
 * 一覧用カスタマイズコンポーネント
 * @param param0.config プラグインの設定データ
 * @returns
 */
export function AppIndex({
  config,
  mode,
}: { config: PluginConfig; mode: IndexMode }) {
  const app = kintone.app.getId();
  if (!app) throw new Error("アプリIDが取得できません");
  const action: QrReadedAction = async (decodedText) => {
    switch (mode) {
      case "regist":
        await regist(app, decodedText, config);
        break;
      case "update":
        await update(app, decodedText, config);
        break;
      case "search":
        await search(app, decodedText, config);
        break;
      default:
        // 網羅性チェック
        mode satisfies never;
        throw new Error(`Unexpected mode: ${mode}`);
    }
  };

  return (
    <div style={{ margin: "8px" }}>
      <QrReader
        action={action}
        size={{ height: "500px", width: "500px" }}
        autoStart={true}
      />
    </div>
  );
}

/**
 * 登録処理
 * @param decodedText QRコードから読み取ったデータ
 * @param config プラグインの設定
 * @returns
 */
async function regist(app: number, decodedText: string, config: PluginConfig) {
  if (!config.useCase.listRegist) throw new Error("登録用の設定がありません");

  const confirmed = confirm(`読取結果（${decodedText}）。登録しますか？`);
  if (!confirmed) return;

  const client = new KintoneRestAPIClient();

  // 重複チェック
  if (config.useCase.listRegist.noDuplicate) {
    // QRコードの読取値に加え、追加絞込条件を加味し、重複チェック対象のレコードを取得
    const additionalQuery =
      config.useCase.listRegist.duplicateCheckAdditionalQuery;
    const query = `${config.qrCode.field} = "${decodedText}"${additionalQuery ? ` and ${additionalQuery}` : ""}`;
    const fetchedRecords = await client.record.getRecords<
      {
        $id: KintoneRecordField.ID;
      } & { [key: string]: KintoneRecordField.OneOf }
    >({
      app,
      query,
    });

    // ある場合はエラー
    if (fetchedRecords.records.length > 0) {
      alert(`既にデータが存在します(${decodedText})`);
      return;
    }
  }

  const record: KintoneRecord = {};
  record[config.qrCode.field] = { value: decodedText };
  if (
    config.useCase.listRegist?.useAdditionalValues &&
    config.useCase.listRegist.additionalValues
  ) {
    for (const additionalValue of config.useCase.listRegist.additionalValues) {
      record[additionalValue.field] = JSON.parse(additionalValue.value);
    }
  }
  await client.record.addRecord({ app, record });

  alert("登録しました");

  window.location.reload();
}

/**
 * 更新処理
 * @param decodedText QRコードから読み取ったデータ
 * @param config プラグインの設定
 * @returns
 */
async function update(app: number, decodedText: string, config: PluginConfig) {
  if (!config.useCase.listUpdate) throw new Error("更新用の設定がありません");

  const confirmed = confirm(`読取結果（${decodedText}）。更新しますか？`);
  if (!confirmed) return;

  const client = new KintoneRestAPIClient();

  // QRコードの読取値に加え、追加絞込条件を加味し、更新対象のレコードを取得
  const additionalQuery = config.useCase.listUpdate.additionalQuery;
  const query = `${config.qrCode.field} = "${decodedText}"${additionalQuery ? ` and ${additionalQuery}` : ""}`;
  const fetchedRecords = await client.record.getRecords<
    {
      $id: KintoneRecordField.ID;
      $revision: KintoneRecordField.Revision;
    } & { [key: string]: KintoneRecordField.OneOf }
  >({
    app,
    query,
  });

  // ない場合・複数ある場合はエラー
  if (fetchedRecords.records.length === 0) {
    alert(`対象のデータが存在しません(${decodedText})`);
    return;
  }
  if (fetchedRecords.records.length > 1) {
    alert(`更新できません：複数のデータが該当します(${decodedText})`);
    return;
  }
  const fetchedRecord = fetchedRecords.records[0];

  // 更新
  const record: KintoneRecord = {};
  for (const updateValue of config.useCase.listUpdate.updateValues) {
    record[updateValue.field] = JSON.parse(updateValue.value);
  }
  try {
    await client.record.updateRecord({
      app,
      id: fetchedRecord.$id.value,
      revision: fetchedRecord.$revision.value,
      record: record,
    });
  } catch (e) {
    alert(
      `更新処理中にエラーが発生しました(他ユーザの更新と競合した可能性があります)\n${(e as Error).message}`,
    );
    return;
  }

  alert("更新しました");

  window.location.reload();
}

/**
 * 検索処理
 * @param decodedText QRコードから読み取ったデータ
 * @param config プラグインの設定
 * @returns
 */
async function search(app: number, decodedText: string, config: PluginConfig) {
  if (!config.useCase.listSearch) throw new Error("検索用の設定がありません");

  const client = new KintoneRestAPIClient();

  // QRコードの読取値に加え、追加絞込条件を加味し、更新対象のレコードを取得
  const additionalQuery = config.useCase.listSearch.additionalQuery;
  const query = `${config.qrCode.field} = "${decodedText}"${additionalQuery ? ` and ${additionalQuery}` : ""}`;
  const fetchedRecords = await client.record.getRecords<
    {
      $id: KintoneRecordField.ID;
    } & { [key: string]: KintoneRecordField.OneOf }
  >({
    app,
    query,
  });

  // ない場合・複数ある場合はエラー
  if (fetchedRecords.records.length === 0) {
    alert(`対象のデータが存在しません(${decodedText})`);
    return;
  }
  if (fetchedRecords.records.length > 1) {
    alert(
      `対象のデータを特定できません：複数のデータが該当します(${decodedText})`,
    );
    return;
  }

  // レコード詳細画面へ遷移
  const fetchedRecord = fetchedRecords.records[0];
  const recordShowUrl = getRecordUrl({
    mode: "show",
    app,
    recordId: fetchedRecord.$id.value,
  });
  location.href = recordShowUrl;
}
