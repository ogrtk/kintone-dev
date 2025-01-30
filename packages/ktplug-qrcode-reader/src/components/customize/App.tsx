import type { KintoneRecord, PluginConfig } from "@/src/types";
import { KintoneRestAPIClient } from "@kintone/rest-api-client";
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
  const action: QrReadedAction = async (decodedText) => {
    switch (mode) {
      case "regist":
        await regist(decodedText, config);
        break;
      case "update":
        await update(decodedText, config);
        break;
      case "search":
        await search(decodedText, config);
        break;
      default:
        throw new Error();
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
async function regist(decodedText: string, config: PluginConfig) {
  const confirmed = confirm(`読取結果（${decodedText}）登録しますか？`);
  if (!confirmed) return;

  const client = new KintoneRestAPIClient();

  const app = kintone.app.getId();
  if (!app) throw new Error("アプリIDが取得できません");

  const record: KintoneRecord = {};
  record[config.qrCode.field] = { value: decodedText };
  if (
    config.useCase.listRegist?.useAdditionalValues &&
    config.useCase.listRegist.additionalValues
  ) {
    for (const additionalValue of config.useCase.listRegist.additionalValues) {
      record[additionalValue.field] = { value: additionalValue.value };
    }
  }
  console.log(record);
  await client.record.addRecord({ app, record });

  alert("登録しました");
}

async function update(decodedText: string, config: PluginConfig) {
  const confirmed = confirm(`読取結果（${decodedText}）。更新しますか？`);
  if (!confirmed) return;

  const client = new KintoneRestAPIClient();

  const app = kintone.app.getId();
  if (!app) throw new Error("アプリIDが取得できません");

  const record: KintoneRecord = {};
  // 追加絞込条件を加味して取得
  const fetchedRecord = client.record.getRecords({ app, query: "" });
  // 複数ある場合はエラー

  // 更新

  // record[config.qrCode.field] = { value: decodedText };
  // if (
  //   config.useCase.listUpdate?.additionalQuery &&
  //   config.useCase.listUpdate.additionalQuery
  // ) {
  //   for (const additionalValue of config.useCase.listRegist.additionalValues) {
  //     record[additionalValue.field] = { value: additionalValue.value };
  //   }
  // }
  // console.log(record);
  // await client.record.addRecord({ app, record });

  alert("更新しました");
}

async function search(decodedText: string, config: PluginConfig) {
  const confirmed = confirm(`読取結果（${decodedText}）。更新しますか？`);
  if (!confirmed) return;

  const client = new KintoneRestAPIClient();

  const app = kintone.app.getId();
  if (!app) throw new Error("アプリIDが取得できません");

  const record: KintoneRecord = {};
  // record[config.qrCode.field] = { value: decodedText };
  // if (
  //   config.useCase.listUpdate?.additionalQuery &&
  //   config.useCase.listUpdate.additionalQuery
  // ) {
  //   for (const additionalValue of config.useCase.listRegist.additionalValues) {
  //     record[additionalValue.field] = { value: additionalValue.value };
  //   }
  // }
  // console.log(record);
  // await client.record.addRecord({ app, record });

  alert("登録しました");
}
