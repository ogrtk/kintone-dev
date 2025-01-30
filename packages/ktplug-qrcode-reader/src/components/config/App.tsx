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
  const [textFields, setTextFields] = useState<SelectOption[]>([]);
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
  const listSearchEnabled = useCaseTypes?.includes("listSearch");
  const listRegistEnabled = useCaseTypes?.includes("listRegist");
  const listUpdateEnabled = useCaseTypes?.includes("listUpdate");
  const recordEnabled = useCaseTypes?.includes("record");
  const useRegistAdditinalValues = watch(
    "useCase.listRegist.useAdditionalValues",
  );

  useEffect(() => {
    // pluginに保存した設定情報を取得
    const config = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);

    // 選択肢の取得
    const fetchFieldsInfo = async () => {
      // スペース項目取得
      const spaceFields = await kintoneFieldsRetriever.getRecordSpaceFields();
      // 1行テキスト取得
      const singleTextFields =
        await kintoneFieldsRetriever.getSingleTextFields();
      // 一覧名取得
      const viewNames = await kintoneFieldsRetriever.getViewNames();

      setSpaceFields(spaceFields);
      setTextFields(singleTextFields);
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
      <KintoneLikeCheckBox
        rhfMethods={methods}
        label="用途種別選択"
        description="本プラグインで利用する用途の種別を選択してください。"
        name="useCase.types"
        options={USECASE_TYPE_SELECTIONS}
      />
      {listSearchEnabled && (
        <>
          <hr />
          <p className="kintoneplugin-label">【一覧での検索用設定】</p>

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
            description="QRコードの値以外に、追加で指定する絞込条件を指定してください。"
            name="useCase.listSearch.additionalQuery"
          />
        </>
      )}

      {listRegistEnabled && (
        <>
          <hr />
          <p className="kintoneplugin-label">【一覧での登録用設定】</p>

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
            label="追加設定値の利用"
            description="読取結果登録時、追加で値を設定する場合はチェックしてください。"
            checkBoxLabel="利用する"
            name="useCase.listRegist.useAdditionalValues"
          />

          {useRegistAdditinalValues && (
            <KintoneLikeTable
              rhfMethods={methods}
              label="追加設定値"
              description="QRコードの値以外に、追加で設定する値を指定してください。"
              name="useCase.listRegist.additionalValues"
              defaultValue={{ field: "", value: "" }}
              fieldMetas={[
                {
                  type: "select",
                  key: "field",
                  label: "フィールドコード",
                  options: textFields,
                },
                { type: "singletext", key: "value", label: "設定値" },
              ]}
            />
          )}
        </>
      )}

      {listUpdateEnabled && (
        <>
          <hr />
          <p className="kintoneplugin-label">【一覧での更新用設定】</p>

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
            description="QRコードの値以外に、追加で指定する絞込条件を指定してください。"
            name="useCase.listUpdate.additionalQuery"
          />

          <KintoneLikeTable
            rhfMethods={methods}
            label="更新値"
            description="QRコードの値以外に、追加で設定する値を指定してください。"
            name="useCase.listUpdate.updateValues"
            defaultValue={{ field: "", value: "" }}
            fieldMetas={[
              {
                type: "select",
                key: "field",
                label: "フィールドコード",
                options: textFields,
              },
              { type: "singletext", key: "value", label: "設定値" },
            ]}
          />
        </>
      )}

      {recordEnabled && (
        <>
          <hr />
          <p className="kintoneplugin-label">【詳細画面用設定】</p>

          <KintoneLikeSelect
            rhfMethods={methods}
            label="一覧名"
            description="機能を有効にする一覧の名称を指定してください。"
            name="useCase.record.space"
            options={spaceFields}
            required
          />
        </>
      )}

      {
        <>
          <hr />
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
            options={textFields}
            required
          />
        </>
      }

      <hr />
      <input
        className="kintoneplugin-button-normal"
        type="submit"
        title="設定を保存"
        value="設定を保存"
      />
    </form>
  );
}
