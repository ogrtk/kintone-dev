import type { PluginConfig } from "@/src/types";
import { type QrReadedAction, QrReader } from "./QrReader";

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

export function AppIndex({ config }: { config: PluginConfig }) {
  const action: QrReadedAction = (decodedText) => {
    console.log("🚀 ~ AppIndex ~ decodedText:", decodedText);
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
