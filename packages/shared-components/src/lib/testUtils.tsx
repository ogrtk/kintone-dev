import { screen, within } from "@testing-library/react";
import { expect } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * カスタムマッチャー
 */
export const customMatchers = {
  /**
   * table要素内のデータをまとめて検証
   */
  toBeTableWithRecords(received: Element, expectedRecords: string[][]) {
    if (received.tagName.toLowerCase() !== "table") {
      return {
        pass: false,
        message: () => `Expected table, but was ${received.tagName} `,
      };
    }

    const tableEl = received as HTMLTableElement;

    for (const [recIndex, rec] of expectedRecords.entries()) {
      for (const [itemIndex, item] of rec.entries()) {
        const cellEl = getCell(tableEl, recIndex + 1, itemIndex + 1);
        try {
          expect(cellEl).toHaveValue(item);
        } catch (e) {
          return {
            pass: false,
            message: () =>
              `value no match(row ${recIndex + 1}, col ${itemIndex + 1}):
${(e as Error).message}`,
          };
        }
      }
    }

    return {
      pass: true,
      message: () => "OK",
    };
  },
};

/**
 * Checkbox グループ内を対象とするwithin
 * @param groupLabel
 * @param withinElement
 * @returns
 */
export function withinCheckBoxGroup(
  groupLabel: string,
  withinElement?: HTMLElement,
): ReturnType<typeof within> {
  return within(getCheckBoxGroup(groupLabel, withinElement));
}

/**
 * ラベル名でCheckboxグループを取得
 * @param groupLabel
 * @param withinElement
 * @returns
 */
export function getCheckBoxGroup(
  groupLabel: string,
  withinElement?: HTMLElement,
): HTMLElement {
  const checkBoxGroup = (() => {
    let labelEl: HTMLElement | null;
    if (withinElement) {
      labelEl = within(withinElement).queryByText(groupLabel, {
        selector: ".kintone-like-checkbox-group",
      });
    } else {
      labelEl = screen.getByText(groupLabel, {
        selector: ".kintone-like-checkbox-group",
      });
    }
    return labelEl ? labelEl.parentElement : undefined;
  })();

  if (!checkBoxGroup)
    throw new Error(
      `"${groupLabel}"で指定されるラジオボタングループを取得できません`,
    );
  return checkBoxGroup;
}

/**
 * ラベル名からテーブルを取得
 * @param tableLabel
 * @param withinElement
 * @returns
 */
export function getTable(
  tableLabel: string,
  withinElement?: HTMLElement,
): HTMLTableElement {
  if (withinElement) {
    return within(withinElement).getByRole("table", { name: tableLabel });
  }
  return screen.getByRole("table", { name: tableLabel });
}

/**
 * テーブル内の指定するセル位置の入力要素を取得
 * @param tableElement
 * @param rowNo
 * @param colNo
 * @returns
 */
export function getCell(
  tableElement: HTMLTableElement,
  rowNo: number,
  colNo: number,
): Element {
  const rows = within(tableElement).getAllByRole("row");

  if (rowNo < 0 || rowNo >= rows.length)
    throw new Error(`テーブルに、指定された行${rowNo}がありません`);

  const row = rows[rowNo];
  const cell = row.querySelector(`td:nth-child(${colNo})`);

  if (!cell) throw new Error(`テーブルに、指定された列${colNo}がありません`);

  const inputEl = cell.querySelector(".kintone-like-input");

  if (!inputEl)
    throw new Error(
      `ライブラリ内部エラー：".kintone-like-input"が設定された要素がありません`,
    );

  return inputEl;
}

export function getTableCell(
  tableLabel: string,
  rowNo: number,
  colNo: number,
  withinElement?: HTMLElement,
): Element {
  const tableElement = getTable(tableLabel, withinElement);
  try {
    const el = getCell(tableElement, rowNo, colNo);
    return el;
  } catch (e: unknown) {
    (e as Error).message += `(テーブル：${tableLabel})`;
    throw e;
  }
  // const rows = within(tableElement).getAllByRole("row");

  // if (rowNo < 0 || rowNo >= rows.length)
  //   throw new Error(
  //     `テーブル"${tableLabel}"に、指定された行${rowNo}がありません`,
  //   );

  // const row = rows[rowNo];
  // const cell = row.querySelector(`td:nth-child(${colNo})`);

  // if (!cell)
  //   throw new Error(
  //     `テーブル"${tableLabel}"に、指定された列${colNo}がありません`,
  //   );

  // const inputEl = cell.querySelector(".kintone-like-input");

  // if (!inputEl)
  //   throw new Error(
  //     `ライブラリ内部エラー：".kintone-like-input"が設定された要素がありません`,
  //   );

  // return inputEl;
}
