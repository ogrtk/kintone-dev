import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
    },
    resolve: {
      alias: {
        "@customize":
          "/workspaces/21-kintone/packages/ktplug-qrcode-reader/src/components/customize",
      },
    },
  }),
);
