(() => {
  /***************************************
   * 設定項目　ここから
   ***************************************/
  // 項目のマッピング設定
  //  paramName: URLパラメータの項目名
  //  formItem: Frombridge上のフィールドコード
  const MAPPINGS = [
    { paramName: "pAnName", formItem: "案件名" },
    { paramName: "pAnNo", formItem: "案件番号" },
    { paramName: "pAnName", formItem: "anName" },
    { paramName: "pAnNo", formItem: "anNo" },
  ];

  // テーブル項目のマッピング設定
  //  paramName: URLパラメータの項目名
  //  mappings: テーブルのマッピング設定（複数テーブルに係る設定の配列）
  //    formItem: Frombridge上のテーブルのフィールドコード
  //    paramTable: URLパラメータ中の対応するテーブル名
  //    columnMappings: 各列のマッピング設定
  //      formColumn: Frombridge上のテーブル列のフィールドコード
  //      paramColumn: URLパラメータ中の対応するテーブル列名

  const TABLE_MAPPINGS = {
    paramName: "pTables",
    mappings: [
      {
        formItem: "質疑",
        paramTable: "pQuestions",
        columnMappings: [
          { formColumn: "質問", paramColumn: "pQuestion" },
          { formColumn: "備考", paramColumn: "pMemo" },
        ],
      },
      {
        formItem: "質疑2",
        paramTable: "pQuestions2",
        columnMappings: [
          { formColumn: "質問2", paramColumn: "pQuestion2" },
          { formColumn: "備考2", paramColumn: "pMemo2" },
        ],
      },
    ],
  };

  /***************************************
   * 設定項目　ここまで
   ***************************************/
  /**
   * フォーム表示時の処理
   */
  formBridge.events.on("form.show", (context) => {
    // 現在のURLのクエリ文字列を解析
    const params = new URLSearchParams(window.location.search);

    // 単一パラメータ値を項目に設定
    if (MAPPINGS && MAPPINGS.length > 0) {
      for (const mapping of MAPPINGS) {
        context.setFieldValue(mapping.formItem, params.get(mapping.paramName));
      }
    }

    // テーブルパラメータ値をテーブル項目に設定
    if (TABLE_MAPPINGS) {
      // URLパラメータの値をJSONとして解析
      const tablesParamString = params.get(TABLE_MAPPINGS.paramName);
      const tables = JSON.parse(tablesParamString);

      // テーブルの設定ごとに処理
      for (const tableMapping of TABLE_MAPPINGS.mappings) {
        // URLパラメータから当該テーブルのデータを抽出
        const tableData = tables.find(
          (table) => tableMapping.paramTable in table,
        );
        if (!tableData) continue;

        // 行ごとに処理
        for (const [index, row] of Object.entries(
          tableData[tableMapping.paramTable],
        )) {
          // ２行目以降は行追加する
          if (index > 0) addRow(tableMapping.formItem);
          // 各列の値を画面項目に設定
          for (const columnMapping of tableMapping.columnMappings) {
            context.setSubtableFieldValue(
              tableMapping.formItem,
              columnMapping.formColumn,
              index,
              row[columnMapping.paramColumn],
            );
          }
        }
      }
    }
  });

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
