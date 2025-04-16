(() => {
  /***************************************
   * 設定項目　ここから
   ***************************************/
  // ブラウザへの保存を有効化するチェックボックス項目のフィールドコード
  const ENABLE_SWITCH_CHECKBOX = "memoryEnabled";
  // ブラウザへの保存を有効化するチェックボックス項目の値
  const SELECTION_ENABLE = "保存する";
  // ブラウザへの保存を行う対象とするformbridgeのイベント
  const SAVE_TARGET_EVENTS = [
    "form.submit", //  回答画面で回答ボタンをクリックしたとき
    "form.confirm", // 回答画面で確認ボタンをクリックしたとき(確認画面設定時)
  ];
  // ブラウザからの読み込みを行う対象とするformbridgeのイベント
  const LOAD_TARGET_EVENTS = [
    "form.show", //  フォーム(回答画面)全体を表示したとき, またはステップを移動してフォームを表示したとき(ステップフォーム設定時のみ)
  ];

  // 保存する対象項目を設定
  const MEMO_TARGET_ITEMS = [
    { formCd: "anNo", memoryCd: "案件番号" },
    { formCd: "案件名", memoryCd: "案件名" },
    { formCd: "memoryEnabled", memoryCd: "保存設定" },
  ];
  // 保存するサブテーブルの対象項目を設定
  const MEMO_TARGET_TABLE_ITEMS = [{ formCd: "質疑", memoryCd: "質疑データ" }];

  /***************************************
   * 設定項目　ここまで
   ***************************************/

  /**
   * ブラウザへ画面上の入力値を保存
   */
  for (const targetEvent of SAVE_TARGET_EVENTS) {
    // 対象イベントすべてに処理を設定
    formBridge.events.on(targetEvent, (context) => {
      console.log(context.getRecord().質疑.value);

      // 保存する設定をユーザが選択していない場合、保存データを消去して終了
      if (
        !context
          .getRecord()
          [ENABLE_SWITCH_CHECKBOX]?.value.includes(SELECTION_ENABLE)
      ) {
        localStorage.clear();
        return;
      }

      // 記憶対象の全項目を対象に実行
      for (const memoTargetItem of MEMO_TARGET_ITEMS) {
        // 画面上の値を取得して、localstorageに保存
        const value = context.getRecord()[memoTargetItem.formCd]?.value;
        // 配列形式のデータ（チェックボックス等）に対応するため、JSON.stringifyでオブジェクトを文字列として保存
        localStorage.setItem(memoTargetItem.memoryCd, JSON.stringify(value));
      }

      // 記憶対象の全テーブル項目を対象に実行
      for (const memoTargetTableItem of MEMO_TARGET_TABLE_ITEMS) {
        // 画面上の値を取得して、localstorageに保存
        const value = context.getRecord()[memoTargetTableItem.formCd]?.value;
        // 配列形式のデータ（チェックボックス等）に対応するため、JSON.stringifyでオブジェクトを文字列として保存
        localStorage.setItem(
          memoTargetTableItem.memoryCd,
          JSON.stringify(value),
        );
      }
    });
  }

  /**
   * ブラウザに保存したデータを読み出す
   */
  for (const targetEvent of LOAD_TARGET_EVENTS) {
    // 対象イベントすべてに処理を設定
    formBridge.events.on(targetEvent, (context) => {
      // 記憶対象の全項目を対象に実行
      for (const memoTargetItem of MEMO_TARGET_ITEMS) {
        // localstorageの値を取得して、画面上に設定
        // オブジェクトを文字列として保存しているため、JSON.parseで復元
        context.setFieldValue(
          memoTargetItem.formCd,
          JSON.parse(localStorage.getItem(memoTargetItem.memoryCd)),
        );
      }

      // 記憶対象の全テーブル項目を対象に実行
      for (const memoTargetTableItem of MEMO_TARGET_TABLE_ITEMS) {
        // localstorageの値を取得して、画面上に設定
        // オブジェクトを文字列として保存しているため、JSON.parseで復元
        const tableData = JSON.parse(
          localStorage.getItem(memoTargetTableItem.memoryCd),
        );

        for (const [index, row] of tableData.entries()) {
          if (index !== 0) addRow(memoTargetTableItem.formCd);

          const rowData = row.value;
          const columnKeys = Object.keys(rowData);

          for (const key of columnKeys) {
            context.setSubtableFieldValue(
              memoTargetTableItem.formCd,
              key,
              index,
              rowData[key].value,
            );
          }
        }
      }
    });
  }

  /**
   * 行追加
   * @param {*} tableFieldCode
   */
  function addRow(tableFieldCode) {
    // 指定要素の配下にあるボタンを取得
    const container = document.querySelector(
      `[data-field-code="${tableFieldCode}"]`,
    );
    const allButtons = container.querySelectorAll("button");

    // tableタグ内に含まれていないボタンが行追加ボタンであるため、クリックする
    const filteredButton = Array.from(allButtons).find(
      (button) => !button.closest("table"),
    );
    filteredButton.click();
  }
})();
