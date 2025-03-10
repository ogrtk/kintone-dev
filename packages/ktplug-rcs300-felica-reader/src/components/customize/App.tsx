import { WebUsbCardReader } from "@/src/lib/WebUsbCardReader";
import { hexToAscii } from "@/src/lib/utils";
import {
  type MemoryReadConfig,
  type PluginConfig,
  pluginConfigSchema,
} from "@/src/types";
import {
  type KintoneRecordField,
  KintoneRestAPIClient,
} from "@kintone/rest-api-client";
import {
  type KintoneRecord,
  restorePluginConfig,
} from "@ogrtk/shared/kintone-utils";
import { useEffect, useState } from "react";

type FelicaData = { idm?: string; memory?: string };

/**
 * 詳細画面の処理
 * @param param0.PLUGIN_ID プラグインのID
 * @returns
 */
export function AppRecord({ PLUGIN_ID }: { PLUGIN_ID: string }) {
  // pluginに保存した設定情報を取得
  const result = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);
  if (!result.success) {
    throw new Error("プラグインの設定にエラーがあります");
  }
  const config = result.data;

  /**
   * レコード編集処理
   * @param data 編集値
   * @param fieldCode1 編集先のフィールドコード1
   * @param fieldCode2 編集先のフィールドコード2
   */
  const editRecord = (
    data: string,
    fieldCode1: string,
    fieldCode2?: string,
  ) => {
    const record = kintone.app.record.get();
    record.record[fieldCode1].value = data;
    // ルックアップ項目の場合、参照先アプリから情報取得
    if (kintone.app.getLookupTargetAppId(fieldCode1) !== null) {
      record.record[fieldCode1].lookup = true;
    }

    if (fieldCode2) {
      record.record[fieldCode2].value = data;
      // ルックアップ項目の場合、参照先アプリから情報取得
      if (kintone.app.getLookupTargetAppId(fieldCode2) !== null) {
        record.record[fieldCode2].lookup = true;
      }
    }

    kintone.app.record.set(record);
  };

  /**
   * カード読み込み処理
   */
  const readbtnHandler = () => {
    // 読取種別に応じた処理を呼び出し
    const readCard = async () => {
      const webUsbCardreader = await WebUsbCardReader.connect(
        import.meta.env.VITE_WEBUSB_DEBUG === "true",
      );
      if (!webUsbCardreader) {
        alert("カードリーダーを接続してください。");
        return;
      }

      if (config.readConfig.readType === "idm") {
        const readed = await readIdm(webUsbCardreader);
        if (!readed) {
          alert("カード読み込みに失敗しました。");
          return;
        }
        editRecord(
          readed.idm,
          config.readConfig.idm.fieldCd1,
          config.readConfig.idm.fieldCd2,
        );
      } else {
        const readed = await readIdmAndMemory(
          webUsbCardreader,
          config.readConfig.memory,
        );
        if (!readed) {
          alert("カード読み込みに失敗しました。");
          return;
        }
        editRecord(
          readed.memoryData,
          config.readConfig.memory.fieldCd1,
          config.readConfig.memory.fieldCd2,
        );

        if (config.readConfig.readType === "both") {
          editRecord(
            readed.idm,
            config.readConfig.idm.fieldCd1,
            config.readConfig.idm.fieldCd2,
          );
        }
      }
    };

    readCard();
  };

  return (
    <div style={{ margin: "8px 16px" }}>
      <div>
        <button type="button" onClick={readbtnHandler}>
          カード読取
        </button>
      </div>
    </div>
  );
}

/**
 * 一覧の処理モード
 */
export type IndexMode = "regist" | "update";

/**
 * 一覧の処理
 * @param param0.PLUGIN_ID プラグインID
 * @param param0.indexMode 一覧の処理モード
 */
export function AppIndex({
  PLUGIN_ID,
  indexMode,
}: { PLUGIN_ID: string; indexMode: IndexMode }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // クエリパラメータにautorunが設定されている場合、カード読込を自動実行
    const searchParams = new URLSearchParams(window.location.search);
    const autorun = searchParams.get("autorun");
    if (autorun === "true") {
      btnCardReaderClicked();
    }
  }, []);

  /**
   * カード読取処理
   */
  const btnCardReaderClicked = () => {
    const doAction = async () => {
      const app = kintone.app.getId();
      if (!app) throw new Error("アプリケーションのIDが取得できません。");

      // pluginに保存した設定情報を取得
      const result = restorePluginConfig(PLUGIN_ID, pluginConfigSchema);
      if (!result.success) {
        throw new Error("プラグインの設定にエラーがあります");
      }
      const config = result.data;

      // カード読取
      const felicaData = await readCard(setMessage, config);
      if (!felicaData) return;

      // 登録・更新処理
      switch (indexMode) {
        case "regist":
          await regist(app, felicaData, config);
          break;
        case "update":
          await update(app, felicaData, config);
          break;
      }
    };

    doAction();
  };

  return (
    <div style={{ margin: "8px 16px" }}>
      <button
        className="kintoneplugin-button-normal"
        type="button"
        onClick={btnCardReaderClicked}
      >
        カード読み取り開始
      </button>
      {message && <p className="message-normal-small">{message}</p>}
    </div>
  );
}

/**
 * 	IDm読み込み処理
 */
async function readIdm(webUsbCardreader: WebUsbCardReader) {
  const readed = await webUsbCardreader.polling();
  return readed;
}

/**
 * 	IDm及びメモリの読み込み処理
 */
async function readIdmAndMemory(
  webUsbCardreader: WebUsbCardReader,
  memoryReadConfig: MemoryReadConfig,
) {
  const serviceCode = memoryReadConfig.serviceCode;

  const readResult = await webUsbCardreader.readWithoutEncryption([
    {
      serviceCode: serviceCode,
      blockListParam: {
        accessMode: "normal",
        blockNoStart: memoryReadConfig.block.start,
        blockNoEnd: memoryReadConfig.block.end,
      },
    },
  ]);

  if (readResult?.blockData) {
    const idm = readResult.idm;

    const trimmed = readResult.blockData.replaceAll(" ", "");
    const memoryData = hexToAscii(
      trimmed.slice(memoryReadConfig.slice.start, memoryReadConfig.slice.end),
    );

    return { idm, memoryData };
  }
  return undefined;
}

/**
 * カード読取
 * @param setMessage メッセージstateの更新関数
 * @param config プラグインの設定
 * @returns カードからの読み取りデータ
 */
async function readCard(
  setMessage: (message: string) => void,
  config: PluginConfig,
): Promise<FelicaData | undefined> {
  // カードリーダーへ接続
  setMessage("カードリーダーに接続中…");
  const webUsbCardreader = await WebUsbCardReader.connect(
    import.meta.env.VITE_WEBUSB_DEBUG === "true",
  );

  if (!webUsbCardreader) {
    alert("カードリーダーを接続してください。");
    setMessage("カードリーダーを接続してください。");
    return;
  }

  // カードを読取り
  setMessage("カードを置いてください。");
  let idm: string | undefined = "";
  let memory: string | undefined = "";
  while (!idm) {
    try {
      // IDm読み取り
      idm = (await readIdm(webUsbCardreader))?.idm;
      // memory読取設定の場合、続けて読み取りを行う
      if (
        (config.readConfig.readType === "memory" ||
          config.readConfig.readType === "both") &&
        idm
      ) {
        setMessage("カード読取中…。");
        memory = (
          await readIdmAndMemory(webUsbCardreader, config.readConfig.memory)
        )?.memoryData;
      }
    } catch (e: unknown) {
      setMessage(`エラーが発生しました:\n${(e as Error).message}`);
      throw e;
    }
  }

  // 読み取り結果のメッセージを編集
  const idmMessageContent = `${config.readConfig.readType !== "memory" ? `IDm : ${idm}` : ""}`;
  const memoryMessageContent = `${config.readConfig.readType !== "idm" ? `${config.readConfig.memory.name} : ${memory}` : ""}`;
  const messageContent =
    idmMessageContent + (idmMessageContent ? "\n" : "") + memoryMessageContent;

  // 処理
  setMessage(`読み取り完了 : ${messageContent}`);

  return { idm, memory };
}

/**
 * 登録処理
 * @param app アプリID
 * @param felicaData カードからの読み取りデータ
 * @param config プラグインの設定
 * @returns
 */
async function regist(
  app: number,
  felicaData: FelicaData,
  config: PluginConfig,
) {
  if (
    !config.useCase.types.includes("listRegist") ||
    !config.useCase.listRegist
  )
    throw new Error("登録処理を行う設定になっていません。処理を中断します。");
  const client = new KintoneRestAPIClient();

  const msg = `(${felicaData.idm ? `IDm:${felicaData.idm} ` : ""}${felicaData.memory ? `memory:${felicaData.memory}` : ""})`;

  // 登録確認
  if (config.useCase.listRegist.confirmBefore) {
    const confirmResult = confirm(`登録してよろしいですか？\n${msg}`);
    if (!confirmResult) {
      window.location.reload();
      return;
    }
  }

  // 重複チェック
  if (config.useCase.listRegist.noDuplicate) {
    const keyCriteria = constructKeyCriteria(config, felicaData);

    // カードからの読取値に加え、追加絞込条件を加味し、重複チェック対象のレコードを取得
    const additionalQuery =
      config.useCase.listRegist.duplicateCheckAdditionalQuery;
    const query = `${keyCriteria}${additionalQuery ? ` and ${additionalQuery}` : ""}`;
    const fetchedRecords = await client.record.getRecords<
      {
        $id: KintoneRecordField.ID;
      } & { [key: string]: KintoneRecordField.OneOf }
    >({
      app,
      query,
    });

    // ある場合はエラー
    if (fetchedRecords.records.length > 0) {
      alert(`既にデータが存在します(${keyCriteria})`);
      return;
    }
  }

  // 登録処理用にデータを編集
  const record: KintoneRecord = {};
  if (
    config.readConfig.readType === "idm" ||
    config.readConfig.readType === "both"
  ) {
    record[config.readConfig.idm.fieldCd1] = { value: felicaData.idm };
    if (config.readConfig.idm.fieldCd2) {
      record[config.readConfig.idm.fieldCd2] = { value: felicaData.idm };
    }
  }
  if (
    config.readConfig.readType === "memory" ||
    config.readConfig.readType === "both"
  ) {
    record[config.readConfig.memory.fieldCd1] = { value: felicaData.memory };
    if (config.readConfig.memory.fieldCd2) {
      record[config.readConfig.memory.fieldCd2] = { value: felicaData.memory };
    }
  }
  if (
    config.useCase.listRegist.useAdditionalValues &&
    config.useCase.listRegist.additionalValues
  ) {
    // 追加項目の編集
    for (const additionalValue of config.useCase.listRegist.additionalValues) {
      record[additionalValue.field] = JSON.parse(additionalValue.value);
    }
  }

  // 登録処理
  try {
    await client.record.addRecord({ app, record });

    if (config.useCase.listRegist.notifyAfter) {
      alert(`登録が完了しました\n${msg}`);
    }
    const autoRunUrl = `${window.location.href}&autorun=true`;
    window.location.href = autoRunUrl;
  } catch (e: unknown) {
    alert("登録に失敗しました（重複登録の可能性があります）");
    console.error((e as Error).message);
    window.location.reload();
  }
}

/**
 * 更新処理
 * @param app アプリID
 * @param felicaData カードからの読み取りデータ
 * @param config プラグインの設定
 * @returns
 */
async function update(
  app: number,
  felicaData: FelicaData,
  config: PluginConfig,
) {
  if (
    !config.useCase.types.includes("listUpdate") ||
    !config.useCase.listUpdate
  )
    throw new Error("更新処理を行う設定になっていません。処理を中断します。");

  const client = new KintoneRestAPIClient();
  const msg = `(${felicaData.idm ? `IDm:${felicaData.idm} ` : ""}${felicaData.memory ? `memory:${felicaData.memory}` : ""})`;

  // 続行確認
  if (config.useCase.listUpdate.confirmBefore) {
    const confirmResult = confirm(`更新してよろしいですか？\n${msg}`);
    if (!confirmResult) {
      window.location.reload();
      return;
    }
  }

  // カードからの読取値に加え、追加絞込条件を加味し、更新対象のレコードを取得
  const keyCriteria = constructKeyCriteria(config, felicaData);
  const additionalQuery = config.useCase.listUpdate.additionalQuery;
  const query = `${keyCriteria}${additionalQuery ? ` and ${additionalQuery}` : ""}`;
  const fetchedRecords = await client.record.getRecords<
    {
      $id: KintoneRecordField.ID;
    } & { [key: string]: KintoneRecordField.OneOf }
  >({
    app,
    query,
  });
  // ない場合・複数ある場合はエラー
  if (fetchedRecords.records.length === 0) {
    alert(`対象のデータが存在しません(${keyCriteria})`);
    return;
  }
  if (fetchedRecords.records.length > 1) {
    alert(`更新できません：複数のデータが該当します(${keyCriteria})`);
    return;
  }
  const fetchedRecord = fetchedRecords.records[0];

  // 更新処理用にデータを編集
  const record: KintoneRecord = {};
  for (const updateValue of config.useCase.listUpdate.updateValues) {
    record[updateValue.field] = JSON.parse(updateValue.value);
  }
  // 更新処理
  try {
    await client.record.updateRecord({
      app,
      id: fetchedRecord.$id.value,
      record: record,
    });
    if (config.useCase.listUpdate.notifyAfter) {
      alert(`更新が完了しました\n${msg}`);
    }
    const autoRunUrl = `${window.location.href}&autorun=true`;
    window.location.href = autoRunUrl;
  } catch (e: unknown) {
    alert("更新に失敗しました");
    window.location.reload();
  }
}

/**
 * キー項目での検索条件を構成
 * @param config
 * @returns
 */
function constructKeyCriteria(
  config: PluginConfig,
  felicaData: FelicaData,
): string {
  switch (config.readConfig.readType) {
    case "idm":
      return `${config.readConfig.idm.fieldCd1} = "${felicaData.idm}"`;
    case "memory":
      return `${config.readConfig.memory.fieldCd1} = "${felicaData.memory}"`;
    case "both":
      if (config.readConfig.uniqueItem === "idm") {
        return `${config.readConfig.idm.fieldCd1} = "${felicaData.idm}"`;
      }
      return `${config.readConfig.memory.fieldCd1} = "${felicaData.memory}"`;
  }
}
