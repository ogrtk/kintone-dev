# ktplug-rcs300-felica-reader

`ktplug-rcs300-felica-reader` は kintone 向けのプラグインで、RC-S300 FeliCa リーダーを利用したカスタマイズを可能にします。

## 動作概要

このプラグインは、RC-S300 FeliCa リーダーを使用して FeliCa カードを読み取り、その情報を基に kintone の一覧画面や詳細画面で登録・更新を行うことができます。

- **一覧画面での利用**

  - 読み取った FeliCa の情報を元に、新しいレコードを登録します。
  - 既存のレコードを更新することができます。

- **詳細画面での利用**

  - FeliCa カードの IDm を特定のフィールドに自動入力します。

このプラグインでは、FeliCa カードの **IDm** および **チップ内のメモリ (非暗号化部分)** からデータを読み取ることができます。

- IDm は FeliCa カード固有の識別番号であり、識別キーとして利用できます。
- メモリ読み取りでは、指定されたサービスコードとブロック範囲に基づき、カード内のデータを取得できます。
  - 職員番号の読み取り等の用途を想定

## インストール手順

1. `dist/` ディレクトリ内の `plugin.zip` を kintone の管理画面からインストールしてください。
2. kintone のアプリ設定でプラグインを有効にしてください。
3. 設定画面を開き、必要なパラメータを入力してください。

## 設定項目

###

| 設定項目                                  | 説明                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **用途種別** (`useCase`)                  | 本プラグインの利用用途を指定                                                                                                           |
| ├ **登録一覧の設定** (`useCase.listRegist`)  | 一覧画面での登録用途の設定                                                                                                            |
| │ ├ `targetViewName`                  | 登録を行う kintone の一覧画面を指定                                                                                                   |
| │ ├ `noDuplicate`                     | 重複登録を防ぐかどうか                                                                                                              |
| │ ├ `duplicateCheckQuery`             | 重複チェック時に追加の条件を指定 (オプション)                                                                                                 |
| │ ├ `useAdditionalValues`             | 追加の値を設定するかどうか                                                                                                            |
| │ ├ `additionalValues`                | 追加の値 (オプション)                                                                                                             |
| │ ├ `confirmBefore`                   | 登録前に確認ダイアログを表示するか                                                                                                        |
| │ ├ `notifyAfter`                     | 登録後に通知を表示するか                                                                                                             |
| ├ **更新一覧の設定** (`useCase.listUpdate`)  | 一覧画面での更新用途の設定                                                                                                            |
| │ ├ `targetViewName`                  | 更新を行う kintone の一覧画面を指定                                                                                                   |
| │ ├ `additionalQuery`                 | 更新時に追加の条件を指定 (オプション)                                                                                                     |
| │ ├ `updateValues`                    | 更新するフィールドと値のセット                                                                                                          |
| │ ├ `confirmBefore`                   | 更新前に確認ダイアログを表示するか                                                                                                        |
| │ ├ `notifyAfter`                     | 更新後に通知を表示するか                                                                                                             |
| ├ **詳細画面の設定** (`useCase.record`)      | 詳細画面でのカスタマイズの設定                                                                                                          |
| │ ├ `targetSpacer`                    | 詳細画面で FeliCa 情報を表示するスペースの ID                                                                                             |
| **読取設定** (`readConfig`)               | FeliCa カードの読取設定を指定                                                                                                       |
| ├ `readType`                          | 読み取り種別 (`idm`: IDmのみ, `memory`: メモリ, `both`: 両方)                                                                         |
| ├ **IDm読み取り設定** (`readConfig.idm`)    | IDm のみを読み取る場合の設定                                                                                                         |
| │ ├ `fieldCd1`                        | IDm を保存するフィールド \*1                                                                                                       |
| │ ├ `fieldCd2`                        | IDm を保存する補助フィールド (オプション)                                                                                                 |
| ├ **メモリ読み取り設定** (`readConfig.memory`) | メモリ読み取りの設定                                                                                                               |
| │ ├ `serviceCode`                     | 読み取り対象のサービスコード (4桁の16進数)                                                                                                 |
| │ ├ `block.start`                     | 読み取り開始ブロック                                                                                                               |
| │ ├ `block.end`                       | 読み取り終了ブロック                                                                                                               |
| │ ├ `slice.start`                     | 取得データの開始位置                                                                                                               |
| │ ├ `slice.end`                       | 取得データの終了位置 (オプション)                                                                                                       |
| │ ├ `fieldCd1`                        | メモリデータを保存するフィールド  \*1                                                                                                    |
| │ ├ `fieldCd2`                        | メモリデータを保存する補助フィールド (オプション)                                                                                               |
| ├ `uniqueItem`                        | readTypeに`both` を選択時、重複チェックや更新のキーにする項目を指定する (`idm` の場合readConfig.idm.fieldCd1、`memory`の場合readConfig.memory.fieldCd1) \*1 |

\*1 readType が idm の場合はreadConfig.idm.fieldCd1 が、memory の場合は readConfig.memory.fieldCd1 が重複チェックや更新時のキーとして扱われます。

## ライセンス

このプロジェクトのライセンスについては、`LICENSE` ファイルを参照してください。

