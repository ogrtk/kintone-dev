import { createRoot } from "react-dom/client";
import { App } from "./components/config/App";

(async (PLUGIN_ID) => {
  const rootEl = document.getElementById("plugin-container");
  if (!rootEl) throw new Error("plugin-container要素がありません");
  const root = createRoot(rootEl);
  root.render(<App PLUGIN_ID={PLUGIN_ID} />);
})(kintone.$PLUGIN_ID);
