import { restorePluginConfig } from "@ogrtk/shared/kintone-utils";
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
      if (!config.useCase.types.includes("record") || !config.useCase.record)
        return;

      const cardReaderBtnFieldCode = config.useCase.record.targetSpacer;
      const el = kintone.app.record.getSpaceElement(
        config.useCase.record.targetSpacer,
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
