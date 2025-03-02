import type { PluginConfig } from "@/src/types";
import {
  getTable,
  restorePluginConfig,
  storePluginConfig,
  withinCheckBoxGroup,
} from "@ogrtk/shared-components";
import "@testing-library/jest-dom/vitest";
import { App } from "@/src/components/config/App";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";

// プラグインの設定をモック
vi.mock("@ogrtk/shared-components", async () => {
  const actual = await vi.importActual<
    typeof import("@ogrtk/shared-components")
  >("@ogrtk/shared-components");
  return {
    ...actual,
    restorePluginConfig: vi.fn(),
    storePluginConfig: vi.fn(),
    KintoneFieldsRetriever: class {
      async getFields() {
        return [
          { label: "データ設定用テキストフィールド", code: "dataTextField" },
          { label: "登録用テキストフィールド", code: "registTextField" },
          { label: "登録用日付フィールド", code: "registDateField" },
          { label: "更新用テキストフィールド", code: "updateTextField" },
          { label: "更新用日付フィールド", code: "updateDateField" },
        ];
      }
      async getRecordSpaceFields() {
        return [{ label: "スペース1", code: "space1" }];
      }
      async getViewNames() {
        return [
          { label: "登録用一覧", code: "listForRegist" },
          { label: "更新用一覧", code: "listForUpdate" },
          { label: "検索用一覧", code: "listForSearch" },
        ];
      }
    },
  };
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
      qrCode: { dataName: "テストデータ", field: "dataTextField" },
      useCase: {
        types: ["record"],
        record: { space: "space1" },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockedConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(await screen.findByLabelText("データ名称")).toHaveValue(
      "テストデータ",
    );
    expect(screen.getByLabelText("データ設定用項目")).toHaveValue(
      "dataTextField",
    );

    // 用途種別選択 の検証
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での登録"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での検索"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での更新"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("詳細画面"),
    ).toBeChecked();

    expect(screen.getByLabelText("QRコードリーダー配置用スペース")).toHaveValue(
      "space1",
    );
    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での検索用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).toBeInTheDocument();
  });

  test("一覧での登録用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      qrCode: { dataName: "テストデータ", field: "dataTextField" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listForRegist",
          noDuplicate: true,
          duplicateCheckAdditionalQuery: "additional query",
          useAdditionalValues: true,
          additionalValues: [
            { field: "registTextField", value: `{ value: "value1" }` },
            { field: "registDateField", value: `{ value: "value2" }` },
          ],
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockedConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    // 【読取データ設定】 の検証
    expect(await screen.findByLabelText("データ名称")).toHaveValue(
      "テストデータ",
    );
    expect(screen.getByLabelText("データ設定用項目")).toHaveValue(
      "dataTextField",
    );

    // 用途種別選択 の検証
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での登録"),
    ).toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での検索"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での更新"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("詳細画面"),
    ).not.toBeChecked();

    // ■一覧での登録用設定 の検証
    const listRegistSection = screen.getByText(
      "■一覧での登録用設定",
    ).parentElement;
    if (!listRegistSection)
      throw new Error("■一覧での登録用設定の親要素が取得できません");

    expect(within(listRegistSection).getByLabelText("一覧名")).toHaveValue(
      "listForRegist",
    );
    expect(
      within(listRegistSection).getByLabelText("重複を許可しない"),
    ).toBeChecked();
    expect(
      within(listRegistSection).getByLabelText("重複チェック時の追加検索条件"),
    ).toHaveValue("additional query");

    expect(
      withinCheckBoxGroup("重複を許可しない", listRegistSection).getByLabelText(
        "重複を許可しない",
      ),
    ).toBeChecked();
    expect(
      withinCheckBoxGroup("追加設定値の利用", listRegistSection).getByLabelText(
        "利用する",
      ),
    ).toBeChecked();
    expect(getTable("追加設定値")).toBeTableWithRecords([
      ["registTextField", `{ value: "value1" }`],
      ["registDateField", `{ value: "value2" }`],
    ]);

    // 他の設定が表示されていないことの検証
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での検索用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("一覧での登録用設定:重複を許可しないがoff時、追加絞込条件が非表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      qrCode: { dataName: "テストデータ", field: "dataTextField" },
      useCase: {
        types: ["listRegist"],
        listRegist: {
          targetViewName: "listForRegist",
          noDuplicate: false,
          duplicateCheckAdditionalQuery: "additional query",
          useAdditionalValues: true,
          additionalValues: [
            { field: "registTextField", value: `{ value: "value1" }` },
            { field: "registDateField", value: `{ value: "value2" }` },
          ],
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockedConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    // ■一覧での登録用設定 の検証
    const listRegistSection = (await screen.findByText("■一覧での登録用設定"))
      .parentElement;
    if (!listRegistSection)
      throw new Error("■一覧での登録用設定の親要素が取得できません");

    expect(
      await within(listRegistSection).findByLabelText("重複を許可しない"),
    ).not.toBeChecked();
    expect(
      within(listRegistSection).queryByLabelText(
        "重複チェック時の追加検索条件",
      ),
    ).not.toBeInTheDocument();
  });

  test("一覧での更新用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      qrCode: { dataName: "テストデータ", field: "dataTextField" },
      useCase: {
        types: ["listUpdate"],
        listUpdate: {
          targetViewName: "listForUpdate",
          additionalQuery: "update additional query",
          updateValues: [
            { field: "updateTextField", value: `{ value: "updateValue1" }` },
            { field: "updateDateField", value: `{ value: "updateValue2" }` },
          ],
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockedConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    // 【読取データ設定】 の検証
    expect(await screen.findByLabelText("データ名称")).toHaveValue(
      "テストデータ",
    );
    expect(screen.getByLabelText("データ設定用項目")).toHaveValue(
      "dataTextField",
    );

    // 用途種別選択 の検証
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での登録"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での検索"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での更新"),
    ).toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("詳細画面"),
    ).not.toBeChecked();

    // ■一覧での更新用設定 の検証
    const listUpdateSection = screen.getByText(
      "■一覧での更新用設定",
    ).parentElement;
    if (!listUpdateSection)
      throw new Error("■一覧での更新用設定の親要素が取得できません");

    expect(within(listUpdateSection).getByLabelText("一覧名")).toHaveValue(
      "listForUpdate",
    );
    expect(
      within(listUpdateSection).getByLabelText("追加絞込条件"),
    ).toHaveValue("update additional query");
    expect(getTable("更新値")).toBeTableWithRecords([
      ["updateTextField", `{ value: "updateValue1" }`],
      ["updateDateField", `{ value: "updateValue2" }`],
    ]);

    // 他の設定が表示されていないことの検証
    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での検索用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("一覧での検索用設定:保存済みの設定を取得して表示", async () => {
    /* arrange */
    const mockedConfig: PluginConfig = {
      qrCode: { dataName: "テストデータ", field: "dataTextField" },
      useCase: {
        types: ["listSearch"],
        listSearch: {
          targetViewName: "listForSearch",
          additionalQuery: "search query",
        },
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockedConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    // 【読取データ設定】 の検証
    expect(await screen.findByLabelText("データ名称")).toHaveValue(
      "テストデータ",
    );
    expect(screen.getByLabelText("データ設定用項目")).toHaveValue(
      "dataTextField",
    );

    // 用途種別選択 の検証
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での登録"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での検索"),
    ).toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での更新"),
    ).not.toBeChecked();
    expect(
      withinCheckBoxGroup("用途種別選択").getByLabelText("詳細画面"),
    ).not.toBeChecked();

    // ■一覧での検索用設定 の検証
    const listSearchSection = screen.getByText(
      "■一覧での検索用設定",
    ).parentElement;
    if (!listSearchSection)
      throw new Error("■一覧での検索用設定の親要素が取得できません");

    expect(within(listSearchSection).getByLabelText("一覧名")).toHaveValue(
      "listForSearch",
    );
    expect(
      within(listSearchSection).getByLabelText("絞り込み条件"),
    ).toHaveValue("search query");

    // 他の設定が表示されていないことの検証
    expect(screen.queryByText("■一覧での登録用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■一覧での更新用設定")).not.toBeInTheDocument();
    expect(screen.queryByText("■詳細画面用設定")).not.toBeInTheDocument();
  });

  test("フォームの保存時に `storePluginConfig` が正しく呼び出される", async () => {
    /* arrange */
    const mockConfig = {
      qrCode: { dataName: "保存データ", field: "dataTextField" },
      useCase: { types: ["record"], record: { space: "space1" } },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);
    await userEvent.type(screen.getByLabelText("データ名称"), "追記");
    userEvent.click(screen.getByRole("button", { name: "設定を保存" }));

    /* assert */
    await waitFor(() => {
      expect(storePluginConfig<PluginConfig>).toHaveBeenCalledWith(
        {
          qrCode: { dataName: "保存データ追記", field: "dataTextField" },
          useCase: { types: ["record"], record: { space: "space1" } },
        },
        expect.any(Function),
      );
    });
  });

  test("一覧の選択肢が正しく取得される", async () => {
    /* arrange & action*/
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    await waitFor(() => {
      expect(screen.getByLabelText("データ設定用項目")).toHaveTextContent(
        "データ設定用テキストフィールド",
      );
      expect(screen.getByLabelText("データ設定用項目")).toHaveTextContent(
        "登録用テキストフィールド",
      );
      expect(screen.getByLabelText("データ設定用項目")).toHaveTextContent(
        "登録用日付フィールド",
      );
      expect(screen.getByLabelText("データ設定用項目")).toHaveTextContent(
        "更新用テキストフィールド",
      );
      expect(screen.getByLabelText("データ設定用項目")).toHaveTextContent(
        "更新用日付フィールド",
      );
    });
  });

  test("用途種別を変更すると、関連する入力フォームが表示される", async () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      qrCode: { dataName: "テストデータ", field: "textField" },
      useCase: {
        types: [],
      },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);
    userEvent.click(
      withinCheckBoxGroup("用途種別選択").getByLabelText("一覧での登録"),
    );

    /* assert */
    expect(await screen.findByText("■一覧での登録用設定")).toBeInTheDocument();
  });

  test("QRコードリーダー配置用スペースの選択肢が正しく表示される", async () => {
    /* arrange */
    const mockConfig: PluginConfig = {
      qrCode: { dataName: "保存データ", field: "dataTextField" },
      useCase: { types: ["record"] },
    };
    (restorePluginConfig as Mock).mockReturnValue(mockConfig);

    /* action */
    render(<App PLUGIN_ID={PLUGIN_ID} />);

    /* assert */
    expect(
      await screen.findByLabelText("QRコードリーダー配置用スペース"),
    ).toHaveTextContent("スペース1");
  });
});
