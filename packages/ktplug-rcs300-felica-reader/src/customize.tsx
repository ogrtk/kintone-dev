import { restorePluginConfig } from "@ogrtk/shared-components";
import { createRoot } from "react-dom/client";
import {
  AppIndex,
  AppRecord,
  type IndexMode,
} from "./components/customize/App";
import { pluginConfigSchema } from "./types";

((PLUGIN_ID) => {
  // 追加・編集画面表示後イベント
  kintone.events.on(
    [
      "app.record.edit.show",
      "app.record.create.show",
      "app.record.index.edit.show",
    ],
    (event) => {
      const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);
      if (
        !config.useCaseConfig.types.includes("record") ||
        !config.useCaseConfig.record
      )
        return;

      const cardReaderBtnFieldCode = config.useCaseConfig.record.targetSpacer;
      const el = kintone.app.record.getSpaceElement(
        config.useCaseConfig.record.targetSpacer,
      );
      if (el) {
        const root = createRoot(el);
        root.render(<AppRecord PLUGIN_ID={PLUGIN_ID} />);
      } else {
        throw new Error(
          `カードリーダーボタン設置用の項目がありません:${cardReaderBtnFieldCode}`,
        );
      }
      return event;
    },
  );

  kintone.events.on(["app.record.index.show"], (event) => {
    const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);

    // 一覧画面用途のモードを判定
    let mode: IndexMode | undefined = undefined;
    if (
      config.useCaseConfig.listRegist &&
      event.viewName === config.useCaseConfig.listRegist.targetViewName
    ) {
      mode = "regist";
    }
    if (
      config.useCaseConfig.listUpdate &&
      event.viewName === config.useCaseConfig.listUpdate.targetViewName
    ) {
      mode = "update";
    }

    if (mode) {
      const el = kintone.app.getHeaderSpaceElement();
      if (el) {
        const root = createRoot(el);
        root.render(<AppIndex PLUGIN_ID={PLUGIN_ID} indexMode={mode} />);
      }
    }
    return event;
  });
})(kintone.$PLUGIN_ID);
