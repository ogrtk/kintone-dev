(() => {
  /***************************************
   * 設定項目　ここから
   ***************************************/
  // FrombridgeのURL
  const FORM_URL =
    "https://6c1e671f.form.kintoneapp.com/public/44eb68cf0fc247e5a22ee604b8892b659a1b4f9f4c2a28e782586dbd6cffb6b6";

  // 項目のマッピング設定
  //  viewItem: kViewerのフィールドコード
  //  paramName: URLパラメータとして設定する項目名
  const MAPPINGS = [
    { viewItem: "案件名", paramName: "pAnName" },
    { viewItem: "案件番号", paramName: "pAnNo" },
    { viewItem: "案件番号", paramName: "pAnNo" },
  ];

  // テーブル項目のマッピング設定
  //  paramName: URLパラメータとして設定する項目名
  //  mappings: テーブルのマッピング設定（複数テーブルに係る設定の配列）
  //    viewItem: kViewer上のテーブルのフィールドコード
  //    paramTable: URLパラメータ中の対応するテーブル名
  //    columnMappings: 各列のマッピング設定
  //      viewColumn: kViewer上のテーブル列のフィールドコード
  //      paramColumn: URLパラメータ中の対応するテーブル列名
  const TABLE_MAPPINGS = {
    paramName: "pTables",
    mappings: [
      {
        viewItem: "質疑",
        paramTable: "pQuestions",
        columnMappings: [
          { viewColumn: "質問", paramColumn: "pQuestion" },
          { viewColumn: "備考", paramColumn: "pMemo" },
        ],
      },
      {
        viewItem: "質疑2",
        paramTable: "pQuestions2",
        columnMappings: [
          { viewColumn: "質問2", paramColumn: "pQuestion2" },
          { viewColumn: "備考2", paramColumn: "pMemo2" },
        ],
      },
    ],
  };

  // リンク設置用スペースのフィールドコード
  const SPACE_FOR_LINK = "spaceField";

  // リンクの表示テキスト
  const LINK_TEXT = "質疑フォームへ";

  // リンクを自タブで開く"_self" or 新しいタブで開く "_blank"
  const LINK_TARGET = "_blank";

  // リンクの表示スタイル
  const LINK_STYLE =
    "text-decoration: underline; color: royalblue; font-size: 1.5rem;";

  /***************************************
   * 設定項目　ここまで
   ***************************************/

  /**
   * 詳細画面表示時の処理
   */
  kviewer.events.on("record.show", (context) => {
    // 入力済みフォーム用のリンク作成
    const linkUrl = constructPrefilledFormlink(
      context.record.kintoneRecord,
      FORM_URL,
      MAPPINGS,
      TABLE_MAPPINGS,
    );
    // リンク配置用要素を取得
    const spaceField = context.getFieldElement(SPACE_FOR_LINK);
    // リンクを配置
    placeLink(spaceField, linkUrl, LINK_TEXT, LINK_TARGET, LINK_STYLE);
  });

  /**
   * 入力済みフォーム用のリンク作成
   */
  function constructPrefilledFormlink(
    kintoneRecord,
    formUrl,
    mappings,
    tableMappings,
  ) {
    const params = new URLSearchParams();
    for (const mapping of mappings) {
      params.append(mapping.paramName, kintoneRecord[mapping.viewItem].value);
    }

    const paramTableDatas = [];

    for (const tableMapping of tableMappings.mappings) {
      const paramTableData = { [tableMapping.paramTable]: [] };

      const tableData = kintoneRecord[tableMapping.viewItem];
      for (const rowData of tableData.value) {
        const paramTableRowData = {};
        for (const columnMapping of tableMapping.columnMappings) {
          paramTableRowData[columnMapping.paramColumn] =
            rowData.value[columnMapping.viewColumn].value;
        }
        paramTableData[tableMapping.paramTable].push(paramTableRowData);
      }

      paramTableDatas.push(paramTableData);
    }

    params.append(tableMappings.paramName, JSON.stringify(paramTableDatas));

    return `${formUrl}?${params.toString()}`;
  }

  /**
   * リンクの設置
   */
  function placeLink(spaceElement, linkUrl, linkText, linkTarget, linkStyle) {
    const alertMsg =
      "\n※ご利用のブラウザによって、フォーム画面でデータを引用表示できない可能性があります。";
    const linkEl = document.createElement("a");
    linkEl.href = linkUrl;
    // URLが8000文字を超える場合、警告表示
    linkEl.text = linkText + (linkUrl.length > 80000 ? alertMsg : "");
    linkEl.target = linkTarget;
    linkEl.style = linkStyle;
    spaceElement.appendChild(linkEl);
  }
})();
