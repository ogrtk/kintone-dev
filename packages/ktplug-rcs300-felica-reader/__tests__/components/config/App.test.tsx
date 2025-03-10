import type { PluginConfig } from "@/src/types";
import {
  getCheckBoxGroup,
  getTable,
  getTableCell,
  withinCheckBoxGroup,
} from "@ogrtk/shared/test-utils";
import "@testing-library/jest-dom/vitest";
import { App } from "@/src/components/config/App";
import {
  restorePluginConfig,
  storePluginConfig,
} from "@ogrtk/shared/kintone-utils";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";

// プラグインの設定をモック
vi.mock("@ogrtk/shared/kintone-utils", async () => {
  const actual = await vi.importActual<
    typeof import("@ogrtk/shared/kintone-utils")
  >("@ogrtk/shared/kintone-utils");
  return {
    ...actual,
    restorePluginConfig: vi.fn(),
    storePluginConfig: vi.fn((data: PluginConfig, func: () => void) => {
      func();
    }),
    KintoneFieldsRetriever: class {
      async getSingleTextFields() {
        return [
          { label: "IDm用テキストフィールド1", code: "idmTextField1" },
          { label: "IDm用テキストフィールド2", code: "idmTextField2" },
          { label: "メモリ用テキストフィールド1", code: "memoryTextField1" },
          { label: "メモリ用テキストフィールド2", code: "memoryTextField2" },
        ];
      }
      async getFields() {
        return [
          { label: "追加設定用フィールド", code: "addField" },
          { label: "更新用フィールド", code: "updateField" },
        ];
      }
      async getRecordSpaceFields() {
        return [
          { label: "スペース1", code: "space1" },
          { label: "スペース2", code: "space2" },
        ];
      }
      async getViewNames() {
        return [
          { label: "登録用一覧", code: "登録用一覧code" },
          { label: "更新用一覧", code: "更新用一覧code" },
        ];
      }
    },
  };
});

// グローバルオブジェクト kintone のmock
globalThis.kintone = {
  app: {
    getId: vi.fn(() => 123),
  } as unknown as typeof kintone.app,
} as unknown as typeof kintone;

// window の mock
const mockAlertFn = vi.fn();
const mockReloadFn = vi.fn();
vi.stubGlobal("alert", mockAlertFn);
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    href: "https://mocked.origin.com/path1/path2",
    reload: mockReloadFn,
    origin: "https://mocked.origin.com",
  },
});

describe("Appコンポーネント", () => {
  const PLUGIN_ID = "test_plugin";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("詳細画面用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );
    expect(screen.getByLabelText("IDm設定用項目2")).toHaveValue(
      "idmTextField2",
    );

    // 用途種別選択 の検証
    expect(getCheckBoxGroup("用途種別")).toHaveCheckedLabels(["詳細画面"]);

    expect(
      screen.getByLabelText("カードリーダー実行用ボタンの配置スペース"),
    ).toHaveValue("space1");
    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).toBeInTheDocument();
  });

  test("一覧での登録用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "登録用一覧code",
          noDuplicate: true,
          duplicateCheckAdditionalQuery: "additional query",
          confirmBefore: true,
          notifyAfter: true,
          useAdditionalValues: true,
          additionalValues: [
            { field: "addField", value: `{"value":"addFieldValue"}` },
          ],
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );
    expect(screen.getByLabelText("IDm設定用項目2")).toHaveValue(
      "idmTextField2",
    );

    // 用途種別選択 の検証
    expect(getCheckBoxGroup("用途種別")).toHaveCheckedLabels(["一覧での登録"]);

    const listRegistSection = screen.getByText(
      "■一覧での登録用設定",
    ).parentElement;
    if (!listRegistSection)
      throw new Error("■一覧での登録用設定の親要素が取得できません");

    expect(within(listRegistSection).getByLabelText("一覧名")).toHaveValue(
      "登録用一覧code",
    );
    expect(getCheckBoxGroup("重複を許可しない")).toHaveCheckedLabels([
      "重複を許可しない",
    ]);
    expect(
      within(listRegistSection).getByLabelText("重複チェック時の追加検索条件"),
    ).toHaveValue("additional query");
    expect(getCheckBoxGroup("追加設定値の利用")).toHaveCheckedLabels([
      "利用する",
    ]);
    expect(getTable("追加設定値")).toHaveTableRecords([
      ["addField", `{"value":"addFieldValue"}`],
    ]);
    expect(getCheckBoxGroup("登録前確認")).toHaveCheckedLabels(["表示する"]);
    expect(getCheckBoxGroup("登録後通知")).toHaveCheckedLabels(["表示する"]);

    expect(screen.queryByText("■一覧での登録用設定")).toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("一覧での登録用設定:重複を許可しないがoff時、追加絞込条件が非表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "登録用一覧code",
          noDuplicate: false,
          confirmBefore: false,
          notifyAfter: false,
          useAdditionalValues: false,
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );

    // 用途種別選択 の検証
    expect(getCheckBoxGroup("用途種別")).toHaveCheckedLabels(["一覧での登録"]);

    const listRegistSection = screen.getByText(
      "■一覧での登録用設定",
    ).parentElement;
    if (!listRegistSection)
      throw new Error("■一覧での登録用設定の親要素が取得できません");

    expect(within(listRegistSection).getByLabelText("一覧名")).toHaveValue(
      "登録用一覧code",
    );
    expect(getCheckBoxGroup("重複を許可しない")).toHaveCheckedLabels([""]);
    expect(
      within(listRegistSection).queryByLabelText(
        "重複チェック時の追加検索条件",
      ),
    ).not.toBeInTheDocument();
    expect(getCheckBoxGroup("追加設定値の利用")).toHaveCheckedLabels([""]);
    expect(
      screen.queryByRole("table", { name: "追加設定値" }),
    ).not.toBeInTheDocument();
    expect(getCheckBoxGroup("登録前確認")).toHaveCheckedLabels([]);
    expect(getCheckBoxGroup("登録後通知")).toHaveCheckedLabels([]);

    expect(screen.queryByText("■一覧での登録用設定")).toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("一覧での更新用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "更新用一覧code",
          updateValues: [
            { field: "updateField", value: `{"value":"updateFieldValue"}` },
          ],
          additionalQuery: "update additional query",
          confirmBefore: true,
          notifyAfter: true,
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );

    // 用途種別選択 の検証
    expect(getCheckBoxGroup("用途種別")).toHaveCheckedLabels(["一覧での更新"]);

    const listUpdateSection = screen.getByText(
      "■一覧での更新用設定",
    ).parentElement;
    if (!listUpdateSection)
      throw new Error("■一覧での更新用設定の親要素が取得できません");

    expect(within(listUpdateSection).getByLabelText("一覧名")).toHaveValue(
      "更新用一覧code",
    );
    expect(
      within(listUpdateSection).getByLabelText("追加絞込条件"),
    ).toHaveValue("update additional query");
    expect(getTable("更新値")).toHaveTableRecords([
      ["updateField", `{"value":"updateFieldValue"}`],
    ]);
    expect(getCheckBoxGroup("更新前確認")).toHaveCheckedLabels(["表示する"]);
    expect(getCheckBoxGroup("更新後通知")).toHaveCheckedLabels(["表示する"]);

    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("読取データ設定(IDm):保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );
    expect(screen.getByLabelText("IDm設定用項目2")).toHaveValue(
      "idmTextField2",
    );

    expect(screen.queryByText("■IDm読取設定")).toBeInTheDocument();
    expect(screen.queryByText("■メモリ読取設定")).not.toBeInTheDocument();
  });

  test("読取データ設定(メモリ):保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "memory",
        memory: {
          fieldCd1: "memoryTextField1",
          fieldCd2: "memoryTextField2",
          name: "メモリ項目",
          serviceCode: "0ABC",
          block: { start: 0, end: 1 },
          slice: { start: 2, end: 3 },
        },
      },
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("データ名称")).toHaveValue(
      "メモリ項目",
    );
    expect(screen.getByLabelText("メモリデータ設定用項目1")).toHaveValue(
      "memoryTextField1",
    );
    expect(screen.getByLabelText("メモリデータ設定用項目2")).toHaveValue(
      "memoryTextField2",
    );
    expect(screen.getByLabelText("サービスコード")).toHaveValue("0ABC");
    expect(screen.getByLabelText("ブロック開始位置")).toHaveValue("0");
    expect(screen.getByLabelText("ブロック終了位置")).toHaveValue("1");
    expect(screen.getByLabelText("データ切取開始位置")).toHaveValue("2");
    expect(screen.getByLabelText("データ切取終了位置")).toHaveValue("3");
    expect(screen.queryByText("■IDm読取設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■メモリ読取設定")).toBeInTheDocument();
  });

  test("読取データ設定(両方):保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "both",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
        memory: {
          fieldCd1: "memoryTextField1",
          fieldCd2: "memoryTextField2",
          name: "メモリ項目",
          serviceCode: "0ABC",
          block: { start: 0, end: 1 },
          slice: { start: 2, end: 3 },
        },
        uniqueItem: "idm",
      },
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );
    expect(screen.getByLabelText("IDm設定用項目2")).toHaveValue(
      "idmTextField2",
    );
    expect(screen.getByLabelText("データ名称")).toHaveValue("メモリ項目");
    expect(screen.getByLabelText("メモリデータ設定用項目1")).toHaveValue(
      "memoryTextField1",
    );
    expect(screen.getByLabelText("メモリデータ設定用項目2")).toHaveValue(
      "memoryTextField2",
    );
    expect(screen.getByLabelText("サービスコード")).toHaveValue("0ABC");
    expect(screen.getByLabelText("ブロック開始位置")).toHaveValue("0");
    expect(screen.getByLabelText("ブロック終了位置")).toHaveValue("1");
    expect(screen.getByLabelText("データ切取開始位置")).toHaveValue("2");
    expect(screen.getByLabelText("データ切取終了位置")).toHaveValue("3");
    expect(screen.getByLabelText("キー項目")).toHaveValue("idm");
    expect(screen.queryByText("■IDm読取設定")).toBeInTheDocument();
    expect(screen.queryByText("■メモリ読取設定")).toBeInTheDocument();
  });

  test("フォームの保存時に `storePluginConfig` が正しく呼び出される", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record", "listRegist", "listUpdate"],
        record: { targetSpacer: "space1" },
        listRegist: {
          noDuplicate: true,
          targetViewName: "登録用一覧code",
          useAdditionalValues: false,
          confirmBefore: true,
          notifyAfter: true,
        },
        listUpdate: {
          targetViewName: "更新用一覧code",
          updateValues: [
            { field: "updateField", value: `{"value":"updateFieldValue"}` },
          ],
          additionalQuery: "update addtional query",
          confirmBefore: true,
          notifyAfter: true,
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveValue(
      "idmTextField1",
    );
    await userEvent.type(await screen.findByLabelText("追加絞込条件"), "追記");
    userEvent.click(screen.getByRole("button", { name: "設定を保存" }));

    /* assert */
    await waitFor(() => {
      expect(storePluginConfig<PluginConfig>).toHaveBeenCalledWith(
        {
          readConfig: {
            readType: "idm",
            idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
          },
          useCase: {
            types: ["record", "listRegist", "listUpdate"],
            record: { targetSpacer: "space1" },
            listRegist: {
              noDuplicate: true,
              targetViewName: "登録用一覧code",
              useAdditionalValues: false,
              confirmBefore: true,
              notifyAfter: true,
              additionalValues: undefined,
              duplicateCheckAdditionalQuery: "",
            },
            listUpdate: {
              targetViewName: "更新用一覧code",
              updateValues: [
                { field: "updateField", value: `{"value":"updateFieldValue"}` },
              ],
              additionalQuery: "update addtional query追記",
              confirmBefore: true,
              notifyAfter: true,
            },
          },
        } as PluginConfig,
        expect.any(Function),
      );
      expect(mockAlertFn).toHaveBeenCalledWith(
        "保存しました。反映のため、アプリを更新してください",
      );
      expect(window.location.href).toEqual("../../flow?app=123");
    });
  });

  test("不正入力して、フォームの保存するとエラーになる", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record", "listRegist", "listUpdate"],
        record: { targetSpacer: "space1" },
        listRegist: {
          noDuplicate: true,
          targetViewName: "登録用一覧code",
          useAdditionalValues: false,
          confirmBefore: true,
          notifyAfter: true,
        },
        listUpdate: {
          targetViewName: "更新用一覧code",
          updateValues: [
            { field: "updateField", value: `{"value":"updateFieldValue"}` },
          ],
          additionalQuery: "update addtional query",
          confirmBefore: true,
          notifyAfter: true,
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);
    // いったん画面表示まで待つ
    await screen.findByLabelText("IDm設定用項目1");
    await userEvent.type(await screen.findByLabelText("追加絞込条件"), "追記");
    await userEvent.type(await getTableCell("更新値", 1, 2), "追記");
    await userEvent.click(screen.getByRole("button", { name: "設定を保存" }));

    /* assert */
    expect(
      await screen.findByText("JSON形式の文字列としてください。"),
    ).toBeInTheDocument();
    expect(storePluginConfig as Mock).not.toHaveBeenCalled();
  });

  test("１行文字列項目の一覧の選択肢が正しく取得される", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveTextContent(
      "IDm用テキストフィールド1",
    );
    expect(await screen.findByLabelText("IDm設定用項目1")).toHaveTextContent(
      "IDm用テキストフィールド2",
    );
  });

  test("１行文字列・選択項目の一覧の選択肢が正しく取得される", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record", "listUpdate"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    await waitFor(() => {
      expect(getTableCell("更新値", 1, 1)).toHaveTextContent(
        "追加設定用フィールド",
      );
      expect(getTableCell("更新値", 1, 1)).toHaveTextContent(
        "更新用フィールド",
      );
    });
  });

  test("用途種別を変更すると、関連する入力フォームが表示される", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record", "listUpdate"],
        record: { targetSpacer: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    expect(await screen.findByText("■一覧での更新用設定")).toBeInTheDocument();
    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();

    userEvent.click(
      withinCheckBoxGroup("用途種別").getByLabelText("一覧での登録"),
    );

    /* assert */
    expect(await screen.findByText("■一覧での登録用設定")).toBeInTheDocument();
  });

  test("カードリーダー配置用スペースの選択肢が正しく表示される", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "idmTextField1", fieldCd2: "idmTextField2" },
      },
      useCase: {
        types: ["record", "listUpdate"],
      },
    };
    (restorePluginConfig as Mock).mockReturnValue({
      success: true,
      data: mockedConfig,
    });

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(
      await screen.findByLabelText("カードリーダー実行用ボタンの配置スペース"),
    ).toHaveTextContent("スペース1");
    expect(
      await screen.findByLabelText("カードリーダー実行用ボタンの配置スペース"),
    ).toHaveTextContent("スペース2");
  });
});
