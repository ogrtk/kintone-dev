# kintone用レポジトリ

このリポジトリでは、以下の kintone 向けのカスタマイズやプラグインを開発・管理しています。

## プラグイン・カスタマイズ一覧

以下のプロジェクトは、kintone や FormBridge のカスタマイズを目的としています。

| プロジェクト名                                                                   | 種別          | 説明                       |
| ------------------------------------------------------------------------- | ----------- | ------------------------ |
| [**ktplug-rcs300-felica-reader**](./releases/tag/fbcust-random-cd%401.0.0) | kintoneアプリ  | RCS300 FeliCa リーダー用プラグイン |
| [**ktplug-qrcode-reader**](./releases/tag/ktplug-qrcode-reader%400.8.0)               | kintoneアプリ  | QRコードリーダー用プラグイン          |
| [**fbcust-random-cd**](./releases/tag/fbcust-random-cd%400.8.0)                       | FormBridge用 | ランダムコード生成のカスタマイズ         |

各プロジェクトの詳細については、それぞれの `README.md` を参照してください。

## 開発者向け情報

### 環境構築

#### 必要なツール

このリポジトリでは以下のツールを使用しています。

- [Node.js](https://nodejs.org/) (推奨バージョン: LTS)
- [pnpm](https://pnpm.io/) (パッケージマネージャー)
- [Vite](https://vitejs.dev/) (フロントエンドビルドツール)
- [Biome](https://biomejs.dev/) (コードフォーマッター & Linter)

#### セットアップ手順

```sh
# pnpm をインストールしていない場合、以下を実行
npm install -g pnpm

# 依存関係をインストール
pnpm install
```

### 共通コンポーネント

このリポジトリには、複数のプロジェクトで利用可能な共通コンポーネントが含まれています。
`packages/` 内の共通モジュールを適切に import して利用してください。

#### 利用方法

##### 1. `vite.config.ts` で共通の Vite 設定を利用

```ts
import baseConfig from "../../vite.config";

export default defineConfig({
  ...baseConfig,
  server: {
    https: baseConfig.server?.https,
  },
});
```

開発用 Web サーバを立ち上げる際、モノレポのルートに配置された証明書ファイル (certifcationフォルダを作成し秘密鍵・証明書を配置してください) を `baseConfig` から取得することで、全プロジェクトで統一した HTTPS 環境を提供できます。

##### 2. `zod` を用いたバリデーションと `submit` 時の処理

このリポジトリでは、`zod` を利用してバリデーションスキーマを定義し、`react-hook-form` と組み合わせてフォームのバリデーションを行います。以下は `ktplug-qrcode-reader` での実装例です。

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KintoneLikeCheckBox } from "@ogrtk/shared-components";

const schema = z.object({
  agreement: z.literal("yes").refine(value => value === "yes", {
    message: "同意が必要です",
  }),
});

function ExampleComponent() {
  const formMethods = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: any) => {
    console.log("送信データ:", data);
  };

  return (
    <form onSubmit={formMethods.handleSubmit(onSubmit)}>
      <KintoneLikeCheckBox
        rhfMethods={formMethods}
        label="同意する"
        description="利用規約に同意してください"
        name="agreement"
        options={[{ code: "yes", label: "はい" }]}
        required
      />
      <button type="submit">送信</button>
    </form>
  );
}
```

##### 3. `zod` 用の各種ユーティリティ

このリポジトリでは、`zodUtils.ts` に `zod` スキーマを補助するユーティリティ関数を提供しています。

###### 例）unsetBoolDependentField を用いた動的バリデーション

`unsetBoolDependentField` は、特定のフィールドが `true` でない場合に、依存するフィールドの値を `undefined` にする `zod` 用の `preprocess` 関数です。

```ts
import { z } from "zod";
import { unsetBoolDependentField } from "@ogrtk/shared-components/lib/zodUtils";

const schema = z.object({
  isChecked: z.boolean(),
  dependentField: z.preprocess(
    unsetBoolDependentField([
      { conditionField: "isChecked", dependentField: "dependentField" },
    ]),
    z.string().optional()
  ),
});

const validData = schema.parse({ isChecked: false, dependentField: "削除される" });
console.log(validData); // { isChecked: false }
```

この関数を使用することで、条件に応じて不要なフィールドをバリデーション前に自動削除できます。

## ライセンス

このプロジェクトのライセンスについては、`LICENSE` ファイルを参照してください。

