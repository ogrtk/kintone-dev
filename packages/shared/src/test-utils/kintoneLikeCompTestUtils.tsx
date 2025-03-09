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
  toHaveTableRecords(received: Element, expectedRecords: string[][]) {
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

  /**
   * checkbox グループ内で選択されている一連のラベルをまとめて検証
   */
  toHaveCheckedLabels(received: Element, checkedLabels: string[]) {
    if (
      received.tagName.toLowerCase() !== "div" ||
      !received.classList.contains("kintone-like-checkbox-group")
    ) {
      return {
        pass: false,
        message: () => "Expected kintonelike checkbox group, but was not",
      };
    }

    const checkBoxLabels = received.querySelectorAll("label");
    for (const checkBoxLabel of Array.from(checkBoxLabels)) {
      const checkInput = document.getElementById(
        checkBoxLabel.htmlFor,
      ) as HTMLInputElement;

      if (
        checkBoxLabel.textContent &&
        checkedLabels.includes(checkBoxLabel.textContent)
      ) {
        if (!checkInput.checked) {
          return {
            pass: false,
            message: () =>
              `Expected checked, but was unchecked: ${checkBoxLabel.textContent}`,
          };
        }
      } else {
        if (checkInput.checked) {
          return {
            pass: false,
            message: () =>
              `Expected unchecked, but was checked: ${checkBoxLabel.textContent}`,
          };
        }
      }
    }
    return {
      pass: true,
      message: () => "ok",
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
        selector: ".kintone-like-checkbox-group-label",
      });
    } else {
      labelEl = screen.getByText(groupLabel, {
        selector: ".kintone-like-checkbox-group-label",
      });
    }
    if (!labelEl)
      throw new Error(
        ".kintone-like-checkbox-group-labelのラベルが見つかりません",
      );
    if (!labelEl.parentElement)
      throw new Error("checkbox-groupの構成が正しくありません");
    const groupEl = labelEl.parentElement.querySelector<HTMLDivElement>(
      "div.kintone-like-checkbox-group",
    );
    if (!groupEl)
      throw new Error(".kintone-like-checkbox-groupが見つかりません");
    return groupEl;
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
 * テーブル内指定セル位置の入力要素を取得
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

/**
 * ラベルで指定したテーブル内の指定セル位置の入力要素を取得
 * @param tableElement
 * @param rowNo
 * @param colNo
 * @returns
 */
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
}
