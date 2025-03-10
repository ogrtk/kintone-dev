import { createRoot } from "react-dom/client";
import { App } from "./components/config/App";
/**
 * プラグイン設定画面のjavascriptエントリポイント
 */
(async (PLUGIN_ID) => {
  // プラグイン設定画面用のhtml中の要素を取得し、Reactコンポーネントを配置
  const rootEl = document.getElementById("plugin-container");
  if (!rootEl) {
    alert("内部エラー：plugin-container要素がありません");
    return;
  }
  const root = createRoot(rootEl);
  root.render(<App PLUGIN_ID={PLUGIN_ID} />);
})(kintone.$PLUGIN_ID);
