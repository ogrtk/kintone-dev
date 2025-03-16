import type {
  FelicaPollingResult,
  FelicaReadWithoutEncryptionResult,
  FelicaRequestServiceResult,
} from "@/src/lib/FelicaService";
import {
  type ReadServiceParam,
  WebUsbCardReader,
} from "@/src/lib/WebUsbCardReader";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";
// RUN_SLOW_TESTS 環境変数がセットされている場合は実行、なければskipする
const testIfSlow = process.env.RUN_SLOW_TESTS ? test : test.skip;

// Mock 用の USBDevice
class MockUSBDevice {
  opened = false;
  constructor(
    public vendorId = 1356,
    public productId = 3528,
  ) {}
  configuration = {
    configurationValue: 1,
    interfaces: [
      {
        alternate: {
          endpoints: [
            { direction: "in", endpointNumber: 1, packetSize: 64 },
            { direction: "out", endpointNumber: 2, packetSize: 64 },
          ],
        },
        interfaceNumber: 0,
      },
    ],
  };

  async open() {
    this.opened = true;
  }
  async close() {
    this.opened = false;
  }
  async transferIn(_endpoint: number, length: number) {
    return { data: new DataView(new ArrayBuffer(length)) };
  }
  async transferOut(_endpoint: number, _data: Uint8Array) {
    return {};
  }
  async selectConfiguration(_configValue: number) {}
  async claimInterface(_interfaceNumber: number) {}
  async releaseInterface(_interfaceNumber: number) {}
}

// FelicaService のモッククラス
const mockFelicaService = {
  // s300 の opened 状態を管理するオブジェクト
  s300: { opened: false },

  // openDevice() を呼ぶと opened を true にする
  openDevice: vi.fn(async () => {
    mockFelicaService.s300.opened = true;
  }),
  // closeDevice() を呼ぶと opened を false にする
  closeDevice: vi.fn(async () => {
    mockFelicaService.s300.opened = false;
  }),
  // polling() はテスト毎に結果を返すようにモック化
  polling: vi.fn(async (): Promise<FelicaPollingResult | undefined> => {
    // デフォルトは有効な応答を返すが、テストごとに mockResolvedValueOnce で上書き可能
    return { idm: "fakeIdm", systemCode: "0ABC" };
  }),
  // requestService() のモック実装
  requestService: vi.fn(
    async (
      idm: string,
      nodeCodeList: number[],
    ): Promise<FelicaRequestServiceResult | undefined> => {
      return { idm, nodeCount: "nodeCount", nodeKeyVerList: "nodeKeyVerList" };
    },
  ),
  // readWithoutEncryption() のモック実装
  readWithoutEncryption: vi.fn(
    async (
      idm: string,
      params: Array<{
        serviceCode: string;
        blockListParam: {
          accessMode: "normal" | "purse-cashback";
          blockNoStart: number;
          blockNoEnd: number;
        };
      }>,
    ): Promise<FelicaReadWithoutEncryptionResult | undefined> => {
      return {
        idm,
        blockData: "aa",
        blockSize: "2",
        statusFlag1: "flg1",
        statusFlag2: "flg2",
      };
    },
  ),
};

// Mock 用の navigator.usb
vi.stubGlobal("navigator", {
  usb: {
    getDevices: vi.fn(async () => []),
    requestDevice: vi.fn(),
  },
});

// window.alert をモック
vi.stubGlobal("alert", vi.fn());

vi.mock("@/src/lib/FelicaService", () => {
  return {
    FelicaService: vi.fn().mockImplementation((usbDevice, isDebug) => {
      mockFelicaService.s300 = usbDevice;
      // モックインスタンスを返す
      return mockFelicaService;
    }),
  };
});

// sleep をモックして待機時間を短縮（本来は 1000ms）
vi.spyOn(await import("../../src/lib/utils"), "sleep").mockResolvedValue(
  undefined,
);

beforeEach(async () => {
  vi.clearAllMocks();
});

describe("connect", () => {
  // let cardReader: WebUsbCardReader | undefined;

  test("ライブラリ動作対象機器がペアリング済み(1356,3528)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValueOnce([
      new MockUSBDevice(1357, 3529),
      new MockUSBDevice(1356, 3528),
    ]);

    const reader = await WebUsbCardReader.connect();
    expect(reader).toBeDefined();
    expect(reader?.felicaService.s300.vendorId).toBe(1356);
    expect(reader?.felicaService.s300.productId).toBe(3528);
  });

  test("ライブラリ動作対象機器がペアリング済み(1356,3529)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValueOnce([
      new MockUSBDevice(1357, 3528),
      new MockUSBDevice(1356, 3529),
    ]);

    const reader = await WebUsbCardReader.connect();
    expect(reader).toBeDefined();
    expect(reader?.felicaService.s300.vendorId).toBe(1356);
    expect(reader?.felicaService.s300.productId).toBe(3529);
  });

  test("ライブラリ動作対象機器でペアリング済み機器無し、リクエスト時に機器あり", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValueOnce([
      new MockUSBDevice(1357, 3528),
      new MockUSBDevice(1356, 3530),
    ]);
    (navigator.usb.requestDevice as Mock).mockResolvedValueOnce(
      new MockUSBDevice(),
    );

    const reader = await WebUsbCardReader.connect();
    expect(navigator.usb.requestDevice as Mock).toHaveBeenCalledWith({
      filters: [
        { vendorId: 1356, productId: 3528 }, // SONY PaSoRi RC-S300/S
        { vendorId: 1356, productId: 3529 }, // SONY PaSoRi RC-S300/P
      ],
    });
    expect(reader).toBeDefined();
    expect(reader?.felicaService.s300.vendorId).toBe(1356);
    expect(reader?.felicaService.s300.productId).toBe(3528);
  });

  test("ライブラリ動作対象機器でペアリング済み機器無し、リクエスト時に機器無し(DomException)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValueOnce([]);
    (navigator.usb.requestDevice as Mock).mockImplementationOnce(async () => {
      throw new DOMException("dom exception");
    });

    const reader = await WebUsbCardReader.connect();
    expect(navigator.usb.requestDevice as Mock).toHaveBeenCalledWith({
      filters: [
        { vendorId: 1356, productId: 3528 }, // SONY PaSoRi RC-S300/S
        { vendorId: 1356, productId: 3529 }, // SONY PaSoRi RC-S300/P
      ],
    });
    expect(reader).not.toBeDefined();
  });

  test("ライブラリ動作対象機器でペアリング済み機器無し、リクエスト時に機器無し(その他Exception)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValueOnce([]);
    (navigator.usb.requestDevice as Mock).mockImplementationOnce(async () => {
      throw new Error("some error");
    });
    await expect(() => WebUsbCardReader.connect()).rejects.toThrow(
      "some error",
    );
    expect(navigator.usb.requestDevice as Mock).toHaveBeenCalledWith({
      filters: [
        { vendorId: 1356, productId: 3528 }, // SONY PaSoRi RC-S300/S
        { vendorId: 1356, productId: 3529 }, // SONY PaSoRi RC-S300/P
      ],
    });
  });
});

describe("polling", () => {
  let reader: WebUsbCardReader;
  beforeEach(async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([new MockUSBDevice()]);
    const conResult = await WebUsbCardReader.connect();
    if (!conResult) throw Error("WebUsbCardReaderの取得に失敗");
    reader = conResult;
  });

  test("１回で成功", async () => {
    const response = await reader.polling();

    expect(response).toEqual({ idm: "fakeIdm", systemCode: "0ABC" });
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledOnce();
    expect(mockFelicaService.closeDevice).toHaveBeenCalledOnce();
  });

  test("２回で成功", async () => {
    mockFelicaService.polling.mockResolvedValueOnce(undefined);

    const response = await reader.polling();

    expect(response).toEqual({ idm: "fakeIdm", systemCode: "0ABC" });
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("２回失敗し、リトライ上限を超過", async () => {
    // polling が最初の試行で有効な応答を返す場合
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);

    const response = await reader.polling(2);

    expect(response).not.toBeDefined();
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("polling時に例外発生", async () => {
    // polling が最初の試行で有効な応答を返す場合
    mockFelicaService.polling.mockRejectedValueOnce(
      new Error("some error occured"),
    );

    await expect(reader.polling()).rejects.toThrow("some error occured");

    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(1);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(1);
  });
});

describe("requestService", () => {
  let reader: WebUsbCardReader;
  beforeEach(async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([new MockUSBDevice()]);
    const conResult = await WebUsbCardReader.connect();
    if (!conResult) throw Error("WebUsbCardReaderの取得に失敗");
    reader = conResult;
  });

  test("成功", async () => {
    const nodeCodeList = [1, 2, 3];

    const result = await reader.requestService(nodeCodeList);

    expect(mockFelicaService.requestService).toHaveBeenCalledWith(
      "fakeIdm",
      nodeCodeList,
    );
    expect(result).toEqual({
      idm: "fakeIdm",
      nodeCount: "nodeCount",
      nodeKeyVerList: "nodeKeyVerList",
    });
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("polling時にundefinedが返される", async () => {
    //  １０回失敗する
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    const nodeCodeList = [1, 2, 3];

    const result = await reader.requestService(nodeCodeList);

    expect(result).not.toBeDefined();
    expect(mockFelicaService.requestService).not.toHaveBeenCalled();
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(10);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(10);
  });

  test("requestService時にundefinedが返される", async () => {
    const nodeCodeList = [1, 2, 3];
    mockFelicaService.requestService.mockResolvedValueOnce(undefined);

    const result = await reader.requestService(nodeCodeList);

    expect(mockFelicaService.requestService).toHaveBeenCalledWith(
      "fakeIdm",
      nodeCodeList,
    );
    expect(result).not.toBeDefined();
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("requestService時に例外発生", async () => {
    const nodeCodeList = [1, 2, 3];
    mockFelicaService.requestService.mockRejectedValueOnce(
      new Error("some error occured in requestService"),
    );

    await expect(reader.requestService(nodeCodeList)).rejects.toThrow(
      "some error occured in requestService",
    );

    expect(mockFelicaService.requestService).toHaveBeenCalledWith(
      "fakeIdm",
      nodeCodeList,
    );
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });
});

describe("readWithoutEncryption", () => {
  let reader: WebUsbCardReader;
  beforeEach(async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([new MockUSBDevice()]);
    const conResult = await WebUsbCardReader.connect();
    if (!conResult) throw Error("WebUsbCardReaderの取得に失敗");
    reader = conResult;
  });

  test("成功", async () => {
    const params: ReadServiceParam[] = [
      {
        blockListParam: {
          accessMode: "normal",
          blockNoStart: 1,
          blockNoEnd: 2,
        },
        serviceCode: "0ABC",
      },
    ];

    mockFelicaService.readWithoutEncryption.mockResolvedValueOnce({
      idm: "fakeIdm",
      blockData: "aa",
      blockSize: "2",
      statusFlag1: "flg1",
      statusFlag2: "flg2",
    });

    const result = await reader.readWithoutEncryption(params);

    expect(mockFelicaService.readWithoutEncryption).toHaveBeenCalledWith(
      "fakeIdm",
      params,
    );
    expect(result).toEqual({
      idm: "fakeIdm",
      blockData: "aa",
      blockSize: "2",
      statusFlag1: "flg1",
      statusFlag2: "flg2",
    });
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("polling時にundefinedが返される", async () => {
    //  １０回失敗する
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);
    mockFelicaService.polling.mockResolvedValueOnce(undefined);

    const params: ReadServiceParam[] = [
      {
        blockListParam: {
          accessMode: "normal",
          blockNoStart: 1,
          blockNoEnd: 2,
        },
        serviceCode: "0ABC",
      },
    ];

    const result = await reader.readWithoutEncryption(params);

    expect(result).not.toBeDefined();
    expect(mockFelicaService.readWithoutEncryption).not.toHaveBeenCalled();
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(10);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(10);
  });

  test("readWithoutEncryption時にundefinedが返される", async () => {
    const params: ReadServiceParam[] = [
      {
        blockListParam: {
          accessMode: "normal",
          blockNoStart: 1,
          blockNoEnd: 2,
        },
        serviceCode: "0ABC",
      },
    ];
    mockFelicaService.readWithoutEncryption.mockResolvedValueOnce(undefined);

    const result = await reader.readWithoutEncryption(params);

    expect(mockFelicaService.readWithoutEncryption).toHaveBeenCalledWith(
      "fakeIdm",
      params,
    );
    expect(result).not.toBeDefined();
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });

  test("readWithoutEncryption時に例外が発生", async () => {
    const params: ReadServiceParam[] = [
      {
        blockListParam: {
          accessMode: "normal",
          blockNoStart: 1,
          blockNoEnd: 2,
        },
        serviceCode: "0ABC",
      },
    ];

    mockFelicaService.readWithoutEncryption.mockRejectedValueOnce(
      new Error("Error occured in readWithoutEncryption"),
    );

    await expect(reader.readWithoutEncryption(params)).rejects.toThrow(
      "Error occured in readWithoutEncryption",
    );

    expect(mockFelicaService.readWithoutEncryption).toHaveBeenCalledWith(
      "fakeIdm",
      params,
    );
    expect(mockFelicaService.s300.opened).toBe(false); // closeされていること
    expect(mockFelicaService.openDevice).toHaveBeenCalledTimes(2);
    expect(mockFelicaService.closeDevice).toHaveBeenCalledTimes(2);
  });
});
