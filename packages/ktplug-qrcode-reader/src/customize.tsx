import { restorePluginConfig } from "@ogrtk/shared-components";
import { createRoot } from "react-dom/client";
import {
  AppIndex,
  AppRecord,
  type IndexMode,
} from "./components/customize/App";
import { type PluginConfig, pluginConfigSchema } from "./types";

/**
 * カスタマイズのjavascriptエントリポイント
 */
((PLUGIN_ID) => {
  /**
   * 追加・編集画面表示後イベント
   */
  kintone.events.on(
    [
      "app.record.edit.show",
      "app.record.create.show",
      "app.record.index.edit.show",
    ],
    (event) => {
      // 設定取得
      const config = getConfig(PLUGIN_ID);

      // レコード用途として設定されていなければ終了
      if (!config.useCase.record) {
        return;
      }

      // 設定されたスペースにQRコードリーダー画面を設置
      const qrReaderSpaceCode = config.useCase.record.space;
      const el = kintone.app.record.getSpaceElement(qrReaderSpaceCode);
      if (el) {
        const root = createRoot(el);
        root.render(<AppRecord config={config} />);
      } else {
        throw new Error(
          `QRコードリーダー設置用の項目がありません:${qrReaderSpaceCode}`,
        );
      }
      return event;
    },
  );

  /**
   * 一蘭画面表示後イベント
   */
  kintone.events.on(["app.record.index.show"], (event) => {
    // 設定取得
    const config = getConfig(PLUGIN_ID);

    // 一覧画面用途とのモードを判定
    let mode: IndexMode | undefined;
    if (
      config.useCase.listRegist &&
      event.viewName === config.useCase.listRegist.targetViewName
    ) {
      mode = "regist";
    }
    if (
      config.useCase.listUpdate &&
      event.viewName === config.useCase.listUpdate.targetViewName
    ) {
      mode = "update";
    }
    if (
      config.useCase.listSearch &&
      event.viewName === config.useCase.listSearch.targetViewName
    ) {
      mode = "search";
    }

    // 対象の一覧が選択されていれば、QRコードリーダーを設置
    if (mode) {
      const el = kintone.app.getHeaderSpaceElement();
      if (el) {
        const root = createRoot(el);
        root.render(<AppIndex config={config} mode={mode} />);
      } else {
        throw new Error(
          "QRコードリーダー設置用のヘッダスペースが取得できません",
        );
      }
    }
    return event;
  });
})(kintone.$PLUGIN_ID);

/**
 * プラグインの設定取得
 * @param PLUGIN_ID
 * @returns
 */
const getConfig = (PLUGIN_ID: string): PluginConfig => {
  const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);
  // 以下はテスト用ロジック
  // const config: PluginConfig = {
  //   useCase: {
  //     types: ["listRegist"],
  //     listRegist: {
  //       targetViewName: "target",
  //       useAdditionalValues: true,
  //       additionalValues: [{ field: "text", value: "aaaa" }],
  //     },
  //     record: { space: "reader" },
  //   },
  //   qrCode: { dataName: "チケットコード", field: "ticketCode" },
  // };
  return config;
};
