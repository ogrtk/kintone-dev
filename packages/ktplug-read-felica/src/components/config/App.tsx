import {
  type PluginConfig,
  READ_TYPE_SELECTIONS,
  USECASE_TYPE_SELECTIONS,
  pluginConfigSchema,
} from "@/src/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KintoneLikeBooleanCheckBox,
  KintoneLikeCheckBox,
  KintoneLikeRadio,
  KintoneLikeSelect,
  KintoneLikeSingleText,
  KintoneLikeTable,
} from "@ogrtk/shared/components";
import {
  KintoneFieldsRetriever,
  type SelectOption,
  restorePluginConfig,
  storePluginConfig,
} from "@ogrtk/shared/kintone-utils";
import "@ogrtk/shared/styles";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type SubmitHandler, UseFormReturn, useForm } from "react-hook-form";

export function App({ PLUGIN_ID }: { PLUGIN_ID: string }) {
  const fetchData = async () => {
    const app = kintone.app.getId();

    if (!app) throw new Error("appが取得できません。");
    // kintoneの項目取得ユーティリティ
    const kintoneFieldsRetriever = new KintoneFieldsRetriever();

    // pluginに保存した設定情報を取得
    const result = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);
    // エラーがある場合、メッセージ表示
    const initConfig = result.data;
    const initMessages = result.success
      ? []
      : result.error.errors.map(
          (error) => ` 項目：${error.path} エラー：${error.message}`,
        );

    // 選択肢の取得
    // カード読み込みボタンの設置場所として、アプリのスペース項目を取得
    // スペース項目取得
    const initSpaceFields = await kintoneFieldsRetriever.getRecordSpaceFields();
    // 1行テキスト取得
    const initFields = await kintoneFieldsRetriever.getFields([
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
    const initSingleTextFields =
      await kintoneFieldsRetriever.getSingleTextFields();
    // 一覧名取得
    const initViewNames = await kintoneFieldsRetriever.getViewNames();

    return {
      initConfig,
      initMessages,
      initFields,
      initSingleTextFields,
      initSpaceFields,
      initViewNames,
    };
  };

  /** suspense query */
  const {
    initConfig,
    initMessages,
    initFields,
    initSingleTextFields,
    initSpaceFields,
    initViewNames,
  } = useSuspenseQuery({
    queryKey: ["fetchData"],
    queryFn: fetchData,
    retry: false, // TODO: どうするか
  }).data;

  // 選択肢の項目用state
  const [fields, _setFields] = useState<SelectOption[]>(initFields);
  const [singleTextFields, _setSingleTextFields] =
    useState<SelectOption[]>(initSingleTextFields);
  const [spaceFields, _setSpaceFields] =
    useState<SelectOption[]>(initSpaceFields);
  const [viewNames, _setViewNames] = useState<SelectOption[]>(initViewNames);
  const [messages, _setMessages] = useState<string[]>(initMessages);

  // react-hook-form
  const methods = useForm<PluginConfig>({
    defaultValues: initConfig,
    resolver: zodResolver(pluginConfigSchema),
  });
  const { handleSubmit, watch } = methods;

  // 動的制御用の監視項目
  const readType = watch("readConfig.readType");
  const useCaseType = watch("useCase.types");
  const listRegistEnabled = useCaseType?.includes("listRegist");
  const listUpdateEnabled = useCaseType?.includes("listUpdate");
  const recordEnabled = useCaseType?.includes("record");
  const noDuplicate = watch("useCase.listRegist.noDuplicate");
  const useRegistAdditinalValues = watch(
    "useCase.listRegist.useAdditionalValues",
  );

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
    <>
      {messages?.map((message) => (
        <p key={message} className="kintoneplugin-alert">
          {message}
        </p>
      ))}

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
          <section>
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
          </section>
        )}
        {(readType === "memory" || readType === "both") && (
          <section>
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
          </section>
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
          name="useCase.types"
          options={USECASE_TYPE_SELECTIONS}
          rhfMethods={methods}
          required
        />

        {listRegistEnabled && (
          <section>
            <p className="kintoneplugin-label">■一覧での登録用設定</p>
            <KintoneLikeSelect
              label="一覧名"
              description="機能を有効にする一覧の名称を指定してください。"
              name="useCase.listRegist.targetViewName"
              options={viewNames}
              rhfMethods={methods}
              required
            />

            <KintoneLikeBooleanCheckBox
              rhfMethods={methods}
              label="重複を許可しない"
              description="カードから読み取ったデータについて、アプリ上での重複を禁止する場合はチェックしてください。"
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

            <KintoneLikeBooleanCheckBox
              label="登録前確認"
              description="カード読取後、登録前に確認ダイアログを表示するかどうかを指定してください。"
              checkBoxLabel="表示する"
              rhfMethods={methods}
              name="useCase.listRegist.confirmBefore"
            />

            <KintoneLikeBooleanCheckBox
              label="登録後通知"
              description="登録後に通知メッセージを表示するかどうかを指定してください。"
              checkBoxLabel="表示する"
              rhfMethods={methods}
              name="useCase.listRegist.notifyAfter"
            />
          </section>
        )}

        {listUpdateEnabled && (
          <section>
            <p className="kintoneplugin-label">■一覧での更新用設定</p>
            <KintoneLikeSelect
              label="一覧名"
              description="機能を有効にする一覧の名称を指定してください。"
              name="useCase.listUpdate.targetViewName"
              options={viewNames}
              rhfMethods={methods}
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

            <KintoneLikeBooleanCheckBox
              label="更新前確認"
              description="カード読取後、更新前に確認ダイアログを表示するかどうかを指定してください。"
              checkBoxLabel="表示する"
              rhfMethods={methods}
              name="useCase.listUpdate.confirmBefore"
            />

            <KintoneLikeBooleanCheckBox
              label="更新後通知"
              description="更新後に通知メッセージを表示するかどうかを指定してください。"
              checkBoxLabel="表示する"
              rhfMethods={methods}
              name="useCase.listUpdate.notifyAfter"
            />
          </section>
        )}

        {recordEnabled && (
          <section>
            <p className="kintoneplugin-label">■詳細画面用設定</p>
            <KintoneLikeSelect
              label="カードリーダー実行用ボタンの配置スペース"
              description="カード読み取りの実行ボタンを配置するフォーム内のスペースを指定してください。"
              name="useCase.record.targetSpacer"
              options={spaceFields}
              rhfMethods={methods}
              required
            />
          </section>
        )}

        <input
          className="kintoneplugin-button-normal"
          type="submit"
          title="設定を保存"
          value="設定を保存"
        />
      </form>
    </>
  );
}
