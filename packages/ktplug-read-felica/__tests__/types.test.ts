// pluginConfig.test.ts
import { pluginConfigSchema } from "@/src/types"; // 実際のモジュールパスに変更してください
import { describe, expect, it } from "vitest";

describe("pluginConfigSchema のテスト", () => {
  it("有効なIDm読み取り設定のプラグイン設定を正しくパースできる", () => {
    const input = {
      useCase: {
        types: ["listRegist", "record"],
        listRegist: {
          targetViewName: "view1",
          noDuplicate: true,
          duplicateCheckAdditionalQuery: "query",
          useAdditionalValues: false,
          // useAdditionalValues が false の場合、additionalValues は preprocessor により削除される
          additionalValues: [{ field: "field1", value: '{"a": 1}' }],
          confirmBefore: false,
          notifyAfter: true,
        },
        record: {
          targetSpacer: "spacer1",
        },
      },
      readConfig: {
        readType: "idm",
        idm: {
          fieldCd1: "field1",
        },
      },
    };

    const result = pluginConfigSchema.parse(input);
    // useAdditionalValues が false の場合、additionalValues は削除される
    expect(result.useCase.listRegist?.additionalValues).toBeUndefined();
    // noDuplicate が true のため duplicateCheckAdditionalQuery は残る
    expect(result.useCase.listRegist?.duplicateCheckAdditionalQuery).toBe(
      "query",
    );
  });

  it("有効なメモリ読み取り設定のプラグイン設定を正しくパースできる", () => {
    const input = {
      useCase: {
        types: ["record"],
        record: { targetSpacer: "spacer1" },
      },
      readConfig: {
        readType: "memory",
        memory: {
          // name を省略した場合、default値が設定されることを確認
          serviceCode: "1A2B",
          block: { start: "0", end: 10 },
          slice: { start: "0", end: 5 },
          fieldCd1: "field1",
        },
      },
    };

    const result = pluginConfigSchema.parse(input);
    expect(result.readConfig.readType).toBe("memory");
    if (result.readConfig.readType === "memory") {
      expect(result.readConfig.memory.name).toBe("読取データ");
      expect(result.readConfig.memory.block.start).toBe(0);
      expect(result.readConfig.memory.block.end).toBe(10);
      expect(result.readConfig.memory.slice.start).toBe(0);
      expect(result.readConfig.memory.slice.end).toBe(5);
    }
  });

  it("有効な両方の読み取り設定 (both) のプラグイン設定を正しくパースできる", () => {
    const input = {
      useCase: {
        types: ["listUpdate", "record"],
        listUpdate: {
          targetViewName: "view2",
          additionalQuery: "some query",
          updateValues: [{ field: "field1", value: '{"key": "value"}' }],
          confirmBefore: true,
          notifyAfter: false,
        },
        record: {
          targetSpacer: "spacer1",
        },
      },
      readConfig: {
        readType: "both",
        idm: {
          fieldCd1: "field1",
          fieldCd2: "field2",
        },
        memory: {
          name: "data",
          serviceCode: "1A2B",
          block: { start: 0, end: 10 },
          slice: { start: 0, end: 5 },
          fieldCd1: "field1",
        },
        uniqueItem: "idm",
      },
    };

    expect(pluginConfigSchema.parse(input)).toEqual(input);
  });

  it("useCase の設定が不足している場合はエラーとなる", () => {
    // types に "listRegist" を含むのに listRegist の設定が存在しない場合
    const input = {
      useCase: {
        types: ["listRegist", "record"],
        record: { targetSpacer: "spacer1" },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "field1" },
      },
    };

    expect(() => pluginConfigSchema.parse(input)).toThrow();
  });

  it("listRegist と listUpdate で同一の targetViewName が指定されている場合はエラーとなる", () => {
    const input = {
      useCase: {
        types: ["listRegist", "listUpdate"],
        listRegist: {
          targetViewName: "sameView",
          noDuplicate: true,
          duplicateCheckAdditionalQuery: "query",
          useAdditionalValues: true,
          additionalValues: [{ field: "field1", value: '{"a": 1}' }],
          confirmBefore: false,
          notifyAfter: true,
        },
        listUpdate: {
          targetViewName: "sameView",
          additionalQuery: "query",
          updateValues: [{ field: "field1", value: '{"a": 1}' }],
          confirmBefore: true,
          notifyAfter: false,
        },
      },
      readConfig: {
        readType: "idm",
        idm: { fieldCd1: "field1" },
      },
    };

    expect(() => pluginConfigSchema.parse(input)).toThrow();
  });

  it("readConfig の both 設定で uniqueItem が不正な場合はエラーとなる", () => {
    const input = {
      useCase: {
        types: ["record"],
        record: { targetSpacer: "spacer1" },
      },
      readConfig: {
        readType: "both",
        idm: { fieldCd1: "field1" },
        memory: {
          name: "data",
          serviceCode: "1A2B",
          block: { start: "0", end: "10" },
          slice: { start: "0", end: "5" },
          fieldCd1: "field1",
        },
        uniqueItem: "invalid", // 不正な値
      },
    };

    expect(() => pluginConfigSchema.parse(input)).toThrow();
  });
});
