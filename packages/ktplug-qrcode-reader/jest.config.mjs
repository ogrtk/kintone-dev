export default {
  testEnvironment: "jsdom",
  resolver: "ts-jest-resolver",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { isolatedModules: true, useESM: true }],
  },
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  transformIgnorePatterns: [
    "/node_modules/(?!html5-qrcode)", // `html5-qrcode` をトランスパイル対象にする
  ],
  moduleDirectories: ["node_modules", "src"], // 追加
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node",
    "css",
    "scss",
  ],
};

// export default {
//   testEnvironment: "jsdom",
//   extensionsToTreatAsEsm: [".ts", ".tsx"],
//   transform: {
//     "^.+\\.(t|j)sx?$": ["ts-jest", { useESM: true }],
//   },
//   moduleNameMapper: {
//     "\\.(css|scss)$": "identity-obj-proxy",
//   },
//   transformIgnorePatterns: [
//     "/node_modules/(?!html5-qrcode)", // `html5-qrcode` をトランスパイル対象にする
//   ],
//   moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "css", "scss"],
//   setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
// };
