import { createRoot } from "react-dom/client";
import { App } from "./components/config/App";

(async (PLUGIN_ID) => {
  const rootEl = document.getElementById("plugin-container");
  if (!rootEl) {
    alert("内部エラー：plugin-container要素がありません");
    return;
  }
  const root = createRoot(rootEl);
  root.render(<App PLUGIN_ID={PLUGIN_ID} />);
})(kintone.$PLUGIN_ID);
