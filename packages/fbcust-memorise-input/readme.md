# fbcust-memorise-input
入力内容のブラウザ保存・復元機能

このJavaScriptは、FormBridgeフォームに入力した内容をブラウザの `localStorage` に保存し、次回アクセス時に自動で入力値を復元するカスタマイズスクリプトです。ユーザーが「保存する」オプションを選択した場合に限り、データを保存・復元する仕組みとなっています。

## ✨ 主な機能

- 指定されたイベント時にフォームの入力内容をブラウザに保存
- 指定されたイベント時にブラウザから保存済みデータを自動復元
- サブテーブル項目にも対応（行追加を含む）

---

## 🔧 設定項目（スクリプト冒頭部分）

以下の設定を変更することで、保存対象項目や保存トリガーをカスタマイズできます。

```javascript
// ① 「保存する」かどうかをユーザーが選択するチェックボックスのフィールドコード
const ENABLE_SWITCH_CHECKBOX = "memoryEnabled";

// ② チェックされたときの値（例：「保存する」など）
const SELECTION_ENABLE = "保存する";

// ③ 入力内容を保存するタイミングを指定（複数指定可能）
const SAVE_TARGET_EVENTS = ["form.submit", "form.confirm"];

// ④ 保存済みの内容を復元するタイミングを指定
const LOAD_TARGET_EVENTS = ["form.show"];

// ⑤ 保存・復元対象のフィールド（通常項目）
const MEMO_TARGET_ITEMS = [
  { formCd: "anNo", memoryCd: "案件番号" },
  { formCd: "案件名", memoryCd: "案件名" },
  { formCd: "memoryEnabled", memoryCd: "保存設定" },
];

// ⑥ 保存・復元対象のサブテーブル項目
const MEMO_TARGET_TABLE_ITEMS = [
  { formCd: "質疑", memoryCd: "質疑データ" }
];
```

> 🔸 `formCd` は FormBridge で設定されたフィールドコード、`memoryCd` はブラウザ保存時のキー名として使われます。

---

## 🚀 利用方法

1. FormBridge 管理画面の「JavaScript/CSSカスタマイズ」にて、本スクリプトのファイルをアップロードしてください。
2. ユーザーがチェックボックスで「保存する」を選択した状態でフォームを送信・確認すると、指定された項目がブラウザに保存されます。
3. 次回フォーム表示時に保存された情報が自動で入力フィールドに復元されます。

---

## 📝 実装の仕組み

### 保存処理
- 指定された `SAVE_TARGET_EVENTS`（例：`form.submit`）が発生したときに、
  - チェックボックスで保存オプションが有効になっていれば、
  - `localStorage` に各フィールドの値を保存します（サブテーブル含む）。

### 復元処理
- 指定された `LOAD_TARGET_EVENTS`（例：`form.show`）が発生したときに、
  - `localStorage` に保存されたデータを各フィールドへ自動設定します。
  - サブテーブルは保存データの行数に応じて `addRow()` 関数で行を追加し、各セルに値を設定します。

---

## ⚠️ 注意点

- 保存された情報はブラウザ（`localStorage`）に保持されるため、同一PC・ブラウザでのみ有効です。
- チェックボックスがオフのまま送信した場合、保存データは自動的に削除されます。
- テーブルの行追加ボタンは、FormBridgeのDOM構造に依存しています。フォームデザイン変更時には動作確認を行ってください。

---

## 🔗 参考

- [FormBridge カスタマイズガイド（公式）](https://formbridge.kintoneapp.com/help/customize/v2)
