import {
  type PluginConfig,
  USECASE_TYPE_SELECTIONS,
  pluginConfigSchema,
} from "@/src/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KintoneFieldsRetriever,
  KintoneLikeBooleanCheckBox,
  KintoneLikeCheckBox,
  KintoneLikeSelect,
  KintoneLikeSingleText,
  KintoneLikeTable,
  type SelectOption,
  restorePluginConfig,
  storePluginConfig,
} from "@ogrtk/shared-components";
import { useEffect, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import "@ogrtk/shared-styles";

/**
 * プラグイン設定画面
 * @param param0.PLUGIN_UD プラグインID。実行時にkintone環境から渡される値
 * @returns
 */
export function App({ PLUGIN_ID }: { PLUGIN_ID: string }) {
  // kintoneの項目取得ユーティリティ
  const kintoneFieldsRetriever = useMemo(
    () => new KintoneFieldsRetriever(),
    [],
  );

  // 選択肢の項目用state
  const [fields, setFields] = useState<SelectOption[]>([]);
  const [spaceFields, setSpaceFields] = useState<SelectOption[]>([]);
  const [viewNames, setViewNames] = useState<SelectOption[]>([]);

  // react-hook-form
  const methods = useForm<PluginConfig>({
    defaultValues: undefined,
    resolver: zodResolver(pluginConfigSchema, undefined, { raw: false }),
  });
  const { handleSubmit, watch, reset } = methods;

  // 動的制御用の監視項目
  const useCaseTypes = watch("useCase.types");
  const listSearchEnabled = useCaseTypes
    ? useCaseTypes.includes("listSearch")
    : undefined;
  const listRegistEnabled = useCaseTypes
    ? useCaseTypes.includes("listRegist")
    : undefined;
  const listUpdateEnabled = useCaseTypes
    ? useCaseTypes.includes("listUpdate")
    : undefined;
  const recordEnabled = useCaseTypes
    ? useCaseTypes.includes("record")
    : undefined;
  const useRegistAdditinalValues = watch(
    "useCase.listRegist.useAdditionalValues",
  );
  const noDuplicate = watch("useCase.listRegist.noDuplicate");

  useEffect(() => {
    // pluginに保存した設定情報を取得
    const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);

    // 選択肢の取得
    const fetchFieldsInfo = async () => {
      // スペース項目取得
      const spaceFields = await kintoneFieldsRetriever.getRecordSpaceFields();
      // 項目取得
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
      // 一覧名取得
      const viewNames = await kintoneFieldsRetriever.getViewNames();

      setSpaceFields(spaceFields);
      setFields(fields);
      setViewNames(viewNames);

      // 動的に候補値を取得したselectについて、表示を正しくするためresetする
      // （useForm時点ではselectのlabelが存在しないため正しく表示できない）
      reset(config);
    };

    fetchFieldsInfo();
  }, [PLUGIN_ID, reset, kintoneFieldsRetriever]);

  /**
   * フォーム内容送信処理
   * @param data
   */
  const saveConfig: SubmitHandler<PluginConfig> = (data) => {
    storePluginConfig(data, () => {
      alert("保存しました。反映のため、アプリを更新してください");
      window.location.href = `../../flow?app=${kintone.app.getId()}`;
    });
  };

  return (
    <form onSubmit={handleSubmit(saveConfig)}>
      {
        <>
          <p className="kintoneplugin-label">【読取データ設定】</p>
          <KintoneLikeSingleText
            rhfMethods={methods}
            label="データ名称"
            description="画面表示で利用するデータの名称を設定してください。"
            name="qrCode.dataName"
          />
          <KintoneLikeSelect
            rhfMethods={methods}
            label="データ設定用項目"
            description="読み取ったデータを編集するフィールドのフィールドコードを指定してください。"
            name="qrCode.field"
            options={fields}
            required
          />
        </>
      }

      <hr />
      <p className="kintoneplugin-label">【用途種別設定】</p>

      <KintoneLikeCheckBox
        rhfMethods={methods}
        label="用途種別選択"
        description="本プラグインで利用する用途の種別を選択してください。"
        name="useCase.types"
        options={USECASE_TYPE_SELECTIONS}
      />
      {listSearchEnabled && (
        <>
          <p className="kintoneplugin-label">■一覧での検索用設定</p>

          <KintoneLikeSelect
            rhfMethods={methods}
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCase.listSearch.targetViewName"
            options={viewNames}
            required
          />

          <KintoneLikeSingleText
            rhfMethods={methods}
            label="絞り込み条件"
            description="QRコードの値以外に、追加で指定する絞込条件を指定してください（クエリの記法については、https://cybozu.dev/ja/kintone/docs/overview/query/ を参照）。"
            name="useCase.listSearch.additionalQuery"
            style={{ width: "40em" }}
          />
        </>
      )}

      {listRegistEnabled && (
        <>
          <p className="kintoneplugin-label">■一覧での登録用設定</p>

          <KintoneLikeSelect
            rhfMethods={methods}
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCase.listRegist.targetViewName"
            options={viewNames}
            required
          />

          <KintoneLikeBooleanCheckBox
            rhfMethods={methods}
            label="重複を許可しない"
            description="QRコードから読み取ったデータについて、アプリ上での重複を禁止する場合はチェックしてください。"
            checkBoxLabel="重複を許可しない"
            name="useCase.listRegist.noDuplicate"
          />

          {noDuplicate && (
            <KintoneLikeSingleText
              rhfMethods={methods}
              label="重複チェック時の追加検索条件"
              description="QRコードの値以外に、追加で指定する検索条件を指定してください（クエリの記法については、https://cybozu.dev/ja/kintone/docs/overview/query/ を参照）。"
              name="useCase.listRegist.duplicateCheckAdditionalQuery"
              style={{ width: "40em" }}
            />
          )}

          <KintoneLikeBooleanCheckBox
            rhfMethods={methods}
            label="追加設定値の利用"
            description="読取結果登録時、追加で値を設定する場合はチェックしてください。"
            checkBoxLabel="利用する"
            name="useCase.listRegist.useAdditionalValues"
          />

          {useRegistAdditinalValues && (
            <KintoneLikeTable
              rhfMethods={methods}
              label="追加設定値"
              description='QRコードの値以外に、追加で設定する値を指定してください（設定値については {"value": "登録値"}といったjson形式で設定。https://cybozu.dev/ja/kintone/docs/overview/field-types/#field-type-update を参照）。'
              name="useCase.listRegist.additionalValues"
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
        </>
      )}

      {listUpdateEnabled && (
        <>
          <p className="kintoneplugin-label">■一覧での更新用設定</p>

          <KintoneLikeSelect
            rhfMethods={methods}
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCase.listUpdate.targetViewName"
            options={viewNames}
            required
          />

          <KintoneLikeSingleText
            rhfMethods={methods}
            label="追加絞込条件"
            description="QRコードの値以外に、追加で指定する絞込条件を指定してください（クエリの記法については、https://cybozu.dev/ja/kintone/docs/overview/query/ を参照）。"
            name="useCase.listUpdate.additionalQuery"
            style={{ width: "40em" }}
          />

          <KintoneLikeTable
            rhfMethods={methods}
            label="更新値"
            description='QRコードの値以外に、追加で設定する値を指定してください（設定値については {"value": "登録値"}といったjson形式で設定。https://cybozu.dev/ja/kintone/docs/overview/field-types/#field-type-update を参照）。'
            name="useCase.listUpdate.updateValues"
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
        </>
      )}

      {recordEnabled && (
        <>
          <p className="kintoneplugin-label">■詳細画面用設定</p>

          <KintoneLikeSelect
            rhfMethods={methods}
            label="QRコードリーダー配置用スペース"
            description="QRコードリーダーの配置場所となる詳細画面内のスペースを指定してください。"
            name="useCase.record.space"
            options={spaceFields}
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
