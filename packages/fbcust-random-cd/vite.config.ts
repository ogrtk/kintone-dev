import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import baseConfig from "../../vite.config";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Viteの設定
export default defineConfig({
	...baseConfig,

	server: {
		https: baseConfig?.server?.https,
		open: path.join("src", "index.js"),
	},
});

