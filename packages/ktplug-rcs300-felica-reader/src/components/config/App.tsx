import {
  type PluginConfig,
  READ_TYPE_SELECTIONS,
  USECASE_TYPE_SELECTIONS,
  pluginConfigSchema,
} from "@/src/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KintoneFieldsRetriever,
  KintoneLikeBooleanCheckBox,
  KintoneLikeCheckBox,
  KintoneLikeRadio,
  KintoneLikeSelect,
  KintoneLikeSingleText,
  KintoneLikeTable,
  type SelectOption,
  restorePluginConfig,
  storePluginConfig,
} from "@ogrtk/shared-components";
import { useEffect, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

export function App({ PLUGIN_ID }: { PLUGIN_ID: string }) {
  // kintoneの項目取得ユーティリティ
  const kintoneFieldsRetriever = useMemo(
    () => new KintoneFieldsRetriever(),
    [],
  );

  // 選択肢の項目用state
  const [fields, setFields] = useState<SelectOption[]>([]);
  const [singleTextFields, setSingleTextFields] = useState<SelectOption[]>([]);
  const [spaceFields, setSpaceFields] = useState<SelectOption[]>([]);
  const [viewNames, setViewNames] = useState<SelectOption[]>([]);

  // react-hook-form
  const methods = useForm<PluginConfig>({
    defaultValues: undefined,
    resolver: zodResolver(pluginConfigSchema),
  });
  const { handleSubmit, watch, reset } = methods;

  // 動的制御用の監視項目
  const readType = watch("readConfig.readType");
  const useCaseType = watch("useCaseConfig.types");
  const listRegistEnabled = useCaseType
    ? useCaseType.includes("listRegist")
    : undefined;
  const listUpdateEnabled = useCaseType
    ? useCaseType.includes("listUpdate")
    : undefined;
  const recordEnabled = useCaseType
    ? useCaseType.includes("record")
    : undefined;
  const noDuplicate = watch("useCaseConfig.listRegist.noDuplicate");
  const useRegistAdditinalValues = watch(
    "useCaseConfig.listRegist.useAdditionalValues",
  );

  useEffect(() => {
    // pluginに保存した設定情報を取得
    const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);

    const app = kintone.app.getId();
    if (!app) throw new Error("appが取得できません。");

    // 選択肢の取得
    const fetchFieldsInfo = async () => {
      // カード読み込みボタンの設置場所として、アプリのスペース項目を取得
      // スペース項目取得
      const spaceFields = await kintoneFieldsRetriever.getRecordSpaceFields();
      // 1行テキスト取得
      const fields = await kintoneFieldsRetriever.getFields([
        "SINGLE_LINE_TEXT",
        "DATE",
        "DATETIME",
        "CHECK_BOX",
        "DROP_DOWN",
        "MULTI_LINE_TEXT",
        "MULTI_SELECT",
        "NUMBER",
        "RADIO_BUTTON",
        "RICH_TEXT",
      ]);
      const singleTextFields =
        await kintoneFieldsRetriever.getSingleTextFields();
      // 一覧名取得
      const viewNames = await kintoneFieldsRetriever.getViewNames();

      setSpaceFields(spaceFields);
      setFields(fields);
      setSingleTextFields(singleTextFields);
      setViewNames(viewNames);

      // 動的に候補値を取得したselectについて、表示を正しくするためresetする
      // （useForm時点ではselectのlabelが存在しないため正しく表示できない）
      reset(config);
    };

    fetchFieldsInfo();
  }, [reset, PLUGIN_ID, kintoneFieldsRetriever]);

  /**
   * フォーム内容送信処理
   * @param data
   */
  const onSubmit: SubmitHandler<PluginConfig> = (data) => {
    storePluginConfig(data, () => {
      alert("保存しました。反映のため、アプリを更新してください");
      window.location.href = `../../flow?app=${kintone.app.getId()}`;
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <p className="kintoneplugin-label">【読取データ設定】</p>

      <KintoneLikeRadio
        label="読取種別"
        description="カードから読み取るデータの種別を指定してください。"
        rhfMethods={methods}
        name="readConfig.readType"
        options={READ_TYPE_SELECTIONS}
        required
      />

      {(readType === "idm" || readType === "both") && (
        <>
          <p className="kintoneplugin-label">■IDm読取設定</p>

          <KintoneLikeSelect
            label="IDm設定用項目1"
            description={`読み取ったIDmを編集するフィールドのフィールドコードを指定してください。${readType !== "both" ? "(この項目は更新や重複チェック時のキーとなります)" : ""}`}
            name="readConfig.idm.fieldCd1"
            rhfMethods={methods}
            options={singleTextFields}
            required
          />

          <KintoneLikeSelect
            label="IDm設定用項目2"
            description="読み取ったIDmを編集するフィールドのフィールドコードを指定してください。"
            name="readConfig.idm.fieldCd2"
            rhfMethods={methods}
            options={singleTextFields}
          />
        </>
      )}
      {(readType === "memory" || readType === "both") && (
        <>
          <p className="kintoneplugin-label">■メモリ読取設定</p>
          <KintoneLikeSingleText
            label="データ名称"
            description="画面表示で利用するデータの名称を設定してください。"
            name="readConfig.memory.name"
            rhfMethods={methods}
          />

          <KintoneLikeSelect
            label="メモリデータ設定用項目1"
            description={`読み取ったメモリデータを編集するフィールドのフィールドコードを指定してください。${readType !== "both" ? "(この項目は更新や重複チェック時のキーとなります)" : ""}`}
            name="readConfig.memory.fieldCd1"
            options={singleTextFields}
            rhfMethods={methods}
            required
          />

          <KintoneLikeSelect
            label="メモリデータ設定用項目2"
            description="読み取ったメモリデータを編集するフィールドのフィールドコードを指定してください。"
            name="readConfig.memory.fieldCd2"
            options={singleTextFields}
            rhfMethods={methods}
          />

          <KintoneLikeSingleText
            label="サービスコード"
            description="読み取るFeliCaカードのサービスコードを入力してください(4桁)。※2文字ずつの16進数表記('0B20'など) "
            name="readConfig.memory.serviceCode"
            rhfMethods={methods}
            required
          />

          <KintoneLikeSingleText
            label="ブロック開始位置"
            description="読み取るFeliCaカードのメモリブロック開始位置を入力してください。"
            name="readConfig.memory.block.start"
            rhfMethods={methods}
            required
          />

          <KintoneLikeSingleText
            label="ブロック終了位置"
            description="読み取るFeliCaカードのメモリブロック終了位置を入力してください。"
            name="readConfig.memory.block.end"
            rhfMethods={methods}
            required
          />

          <KintoneLikeSingleText
            label="データ切取開始位置"
            description="読み取ったブロックデータの切取開始位置を入力してください。"
            name="readConfig.memory.slice.start"
            rhfMethods={methods}
            required
          />

          <KintoneLikeSingleText
            label="データ切取終了位置"
            description="読み取ったブロックデータの切取終了位置を入力してください。"
            name="readConfig.memory.slice.end"
            rhfMethods={methods}
            required
          />
        </>
      )}

      {readType === "both" && (
        <KintoneLikeSelect
          label="キー項目"
          description="IDmかメモリデータのどちらをキー項目として利用するかを指定してください（選択した項目を重複チェックや更新時のキー項目として扱います）。"
          name="readConfig.uniqueItem"
          options={[
            { code: "", label: "" },
            { code: "idm", label: "IDm設定用項目1" },
            { code: "memory", label: "メモリデータ設定用項目1" },
          ]}
          rhfMethods={methods}
          required
        />
      )}
      <hr />

      <p className="kintoneplugin-label">【用途種別設定】</p>

      <KintoneLikeCheckBox
        label="用途種別"
        description="カードリーダを利用する用途の種別を指定してください。"
        name="useCaseConfig.types"
        options={USECASE_TYPE_SELECTIONS}
        rhfMethods={methods}
        required
      />

      {listRegistEnabled && (
        <>
          <p className="kintoneplugin-label">■一覧での登録用設定</p>
          <KintoneLikeSelect
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCaseConfig.listRegist.targetViewName"
            options={viewNames}
            rhfMethods={methods}
            required
          />

          <KintoneLikeBooleanCheckBox
            rhfMethods={methods}
            label="重複を許可しない"
            description="カードから読み取ったデータについて、アプリ上での重複を禁止する場合はチェックしてください。"
            checkBoxLabel="重複を許可しない"
            name="useCaseConfig.listRegist.noDuplicate"
          />

          {noDuplicate && (
            <KintoneLikeSingleText
              rhfMethods={methods}
              label="重複チェック時の追加検索条件"
              description="QRコードの値以外に、追加で指定する検索条件を指定してください（クエリの記法については、https://cybozu.dev/ja/kintone/docs/overview/query/ を参照）。"
              name="useCaseConfig.listRegist.duplicateCheckAdditionalQuery"
              style={{ width: "40em" }}
            />
          )}

          <KintoneLikeBooleanCheckBox
            rhfMethods={methods}
            label="追加設定値の利用"
            description="読取結果登録時、追加で値を設定する場合はチェックしてください。"
            checkBoxLabel="利用する"
            name="useCaseConfig.listRegist.useAdditionalValues"
          />

          {useRegistAdditinalValues && (
            <KintoneLikeTable
              rhfMethods={methods}
              label="追加設定値"
              description='QRコードの値以外に、追加で設定する値を指定してください（設定値については {"value": "登録値"}といったjson形式で設定。https://cybozu.dev/ja/kintone/docs/overview/field-types/#field-type-update を参照）。'
              name="useCaseConfig.listRegist.additionalValues"
              defaultValue={{ field: "", value: "" }}
              fieldMetas={[
                {
                  type: "select",
                  key: "field",
                  label: "フィールドコード",
                  options: fields,
                },
                {
                  type: "singletext",
                  key: "value",
                  label: "設定値",
                  style: {
                    width: "40em",
                  },
                },
              ]}
            />
          )}

          <KintoneLikeBooleanCheckBox
            label="登録前確認"
            description="カード読取後、登録前に確認ダイアログを表示するかどうかを指定してください。"
            checkBoxLabel="表示する"
            rhfMethods={methods}
            name="useCaseConfig.listRegist.confirmBefore"
          />

          <KintoneLikeBooleanCheckBox
            label="登録後通知"
            description="登録後に通知メッセージを表示するかどうかを指定してください。"
            checkBoxLabel="表示する"
            rhfMethods={methods}
            name="useCaseConfig.listRegist.notifyAfter"
          />
        </>
      )}

      {listUpdateEnabled && (
        <>
          <p className="kintoneplugin-label">■一覧での更新用設定</p>
          <KintoneLikeSelect
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCaseConfig.listUpdate.targetViewName"
            options={viewNames}
            rhfMethods={methods}
            required
          />

          <KintoneLikeSingleText
            rhfMethods={methods}
            label="追加絞込条件"
            description="QRコードの値以外に、追加で指定する絞込条件を指定してください（クエリの記法については、https://cybozu.dev/ja/kintone/docs/overview/query/ を参照）。"
            name="useCaseConfig.listUpdate.additionalQuery"
            style={{ width: "40em" }}
          />

          <KintoneLikeTable
            rhfMethods={methods}
            label="更新値"
            description='QRコードの値以外に、追加で設定する値を指定してください（設定値については {"value": "登録値"}といったjson形式で設定。https://cybozu.dev/ja/kintone/docs/overview/field-types/#field-type-update を参照）。'
            name="useCaseConfig.listUpdate.updateValues"
            defaultValue={{ field: "", value: "" }}
            fieldMetas={[
              {
                type: "select",
                key: "field",
                label: "フィールドコード",
                options: fields,
              },
              {
                type: "singletext",
                key: "value",
                label: "設定値",
                style: { width: "40em" },
              },
            ]}
          />

          <KintoneLikeBooleanCheckBox
            label="更新前確認"
            description="カード読取後、更新前に確認ダイアログを表示するかどうかを指定してください。"
            checkBoxLabel="表示する"
            rhfMethods={methods}
            name="useCaseConfig.listUpdate.confirmBefore"
          />

          <KintoneLikeBooleanCheckBox
            label="更新後通知"
            description="更新後に通知メッセージを表示するかどうかを指定してください。"
            checkBoxLabel="表示する"
            rhfMethods={methods}
            name="useCaseConfig.listUpdate.notifyAfter"
          />
        </>
      )}

      {recordEnabled && (
        <>
          <p className="kintoneplugin-label">■詳細画面用設定</p>
          <KintoneLikeSelect
            label="カードリーダー実行用ボタンの配置スペース"
            description="カード読み取りの実行ボタンを配置するフォーム内のスペースを指定してください。"
            name="useCaseConfig.record.targetSpacer"
            options={spaceFields}
            rhfMethods={methods}
            required
          />
        </>
      )}

      <input
        className="kintoneplugin-button-normal"
        type="submit"
        title="設定を保存"
        value="設定を保存"
      />
    </form>
  );
}
