import {
  BlockListParam,
  ReadServiceParam,
  WebUsbCardReader,
} from "@/src/lib/WebUsbCardReader";
import {
  type Mock,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from "vitest";

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

// Mock 用の navigator.usb
vi.stubGlobal("navigator", {
  usb: {
    getDevices: vi.fn(async () => []),
    requestDevice: vi.fn(),
  },
});

// window.alert をモック
vi.stubGlobal("alert", vi.fn());

beforeEach(async () => {
  vi.clearAllMocks();
});

describe("connect", () => {
  // let cardReader: WebUsbCardReader | undefined;

  test("ライブラリ動作対象機器がペアリング済み(1356,3528)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([
      new MockUSBDevice(1357, 3529),
      new MockUSBDevice(1356, 3528),
    ]);

    const reader = await WebUsbCardReader.connect();
    expect(reader).toBeDefined();
    expect(reader?.felicaService.s300.vendorId).toBe(1356);
    expect(reader?.felicaService.s300.productId).toBe(3528);
  });

  test("ライブラリ動作対象機器がペアリング済み(1356,3529)", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([
      new MockUSBDevice(1357, 3528),
      new MockUSBDevice(1356, 3529),
    ]);

    const reader = await WebUsbCardReader.connect();
    expect(reader).toBeDefined();
    expect(reader?.felicaService.s300.vendorId).toBe(1356);
    expect(reader?.felicaService.s300.productId).toBe(3529);
  });

  test("ライブラリ動作対象機器でペアリング済み機器無し、リクエスト時に機器あり", async () => {
    (navigator.usb.getDevices as Mock).mockResolvedValue([
      new MockUSBDevice(1357, 3528),
      new MockUSBDevice(1356, 3530),
    ]);
    (navigator.usb.requestDevice as Mock).mockResolvedValue(
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
    (navigator.usb.getDevices as Mock).mockResolvedValue([]);
    (navigator.usb.requestDevice as Mock).mockImplementation(async () => {
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
    (navigator.usb.getDevices as Mock).mockResolvedValue([]);
    (navigator.usb.requestDevice as Mock).mockImplementation(async () => {
      throw new Error("some error");
    });
    expect(() => WebUsbCardReader.connect()).rejects.toThrow("some error");
    expect(navigator.usb.requestDevice as Mock).toHaveBeenCalledWith({
      filters: [
        { vendorId: 1356, productId: 3528 }, // SONY PaSoRi RC-S300/S
        { vendorId: 1356, productId: 3529 }, // SONY PaSoRi RC-S300/P
      ],
    });
  });
});

// describe("WebUsbCardReader", () => {
//   let cardReader: WebUsbCardReader | undefined;

//   beforeEach(async () => {
//     vi.clearAllMocks();
//     cardReader = await WebUsbCardReader.connect();
//   });

//   afterEach(async () => {
//     if (cardReader) {
//       await cardReader.readWithoutEncryption([]);
//     }
//   });

//   it("should connect to a USB device", async () => {
//     expect(cardReader).toBeDefined();
//   });

//   it("should return undefined if no device is found", async () => {
//     vi.spyOn(navigator.usb, "requestDevice").mockRejectedValue(
//       new DOMException(),
//     );
//     const result = await WebUsbCardReader.connect();
//     expect(result).toBeUndefined();
//   });

//   it("should throw an error when trying to read without encryption with invalid params", async () => {
//     if (!cardReader) return;

//     await expect(cardReader.readWithoutEncryption([])).rejects.toThrow(
//       "paramsが不正です。対象のサービスは1〜16個の範囲で指定してください",
//     );
//   });

//   it("should poll a device and return IDm & System Code", async () => {
//     if (!cardReader) return;

//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     vi.spyOn(cardReader as any, "felicaPolling").mockResolvedValue({
//       idm: "0102030405060708",
//       systemCode: "1234",
//     });

//     const result = await cardReader.polling();
//     expect(result).toEqual({
//       idm: "0102030405060708",
//       systemCode: "1234",
//     });
//   });

//   it("should return undefined when polling fails", async () => {
//     if (!cardReader) return;

//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     vi.spyOn(cardReader as any, "felicaPolling").mockResolvedValue(undefined);
//     const result = await cardReader.polling();
//     expect(result).toBeUndefined();
//   });

//   it("should read without encryption", async () => {
//     if (!cardReader) return;

//     const params: ReadServiceParam[] = [
//       {
//         serviceCode: "1234",
//         blockListParam: {
//           accessMode: "normal",
//           blockNoStart: 0,
//           blockNoEnd: 1,
//         },
//       },
//     ];

//     vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       cardReader as any,
//       "felicaReadWithoutEncryption",
//     ).mockResolvedValue({
//       idm: "0102030405060708",
//       statusFlag1: "00",
//       statusFlag2: "00",
//       blockSize: "10",
//       blockData: "abcdef",
//     });

//     const result = await cardReader.readWithoutEncryption(params);
//     expect(result).toEqual({
//       idm: "0102030405060708",
//       statusFlag1: "00",
//       statusFlag2: "00",
//       blockSize: "10",
//       blockData: "abcdef",
//     });
//   });

//   it("should return undefined when readWithoutEncryption fails", async () => {
//     if (!cardReader) return;

//     vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       cardReader as any,
//       "felicaReadWithoutEncryption",
//     ).mockResolvedValue(undefined);
//     const result = await cardReader.readWithoutEncryption([]);
//     expect(result).toBeUndefined();
//   });

//   it("should throw an error when constructing a block list with invalid block count", () => {
//     if (!cardReader) return;

//     const param: BlockListParam = {
//       accessMode: "normal",
//       blockNoStart: 0,
//       blockNoEnd: 0x10000, // 超過した値
//     };

//     expect(() =>
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       (cardReader as any).constructBlkList(param, 0),
//     ).toThrow("blockCountが不正です");
//   });

//   it("should correctly construct a block list", () => {
//     if (!cardReader) return;

//     const param: BlockListParam = {
//       accessMode: "normal",
//       blockNoStart: 0,
//       blockNoEnd: 1,
//     };

//     const result =
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       (cardReader as any).constructBlkList(param, 2);
//     expect(result).toEqual([130, 0, 130, 1]);
//   });

//   it("should correctly handle requestService", async () => {
//     if (!cardReader) return;

//     vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       cardReader as any,
//       "felicaRequestService",
//     ).mockResolvedValue({
//       idm: "0102030405060708",
//       nodeCount: "01",
//       nodeKeyVerList: "ABCD",
//     });

//     const result = await cardReader.requestService([0x1234, 0x5678]);
//     expect(result).toEqual({
//       idm: "0102030405060708",
//       nodeCount: "01",
//       nodeKeyVerList: "ABCD",
//     });
//   });

//   it("should throw an error if requestService fails", async () => {
//     if (!cardReader) return;

//     vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       cardReader as any,
//       "felicaRequestService",
//     ).mockRejectedValue(new Error("Test Error"));
//     await expect(cardReader.requestService([0x1234])).rejects.toThrow(
//       "Test Error",
//     );
//   });

//   // 追加テストケース（既存のdescribe("WebUsbCardReader", () => { ... }) 内に追加）

//   // 1. getDevicesで既にペアリング済みデバイスが存在する場合の分岐
//   it("should select an already paired device from getDevices when matching", async () => {
//     // モックデバイスを作成（フィルタにマッチする vendorId / productId）
//     const matchingDevice = new MockUSBDevice();
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     (matchingDevice as any).vendorId = 1356;
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     (matchingDevice as any).productId = 3528;
//     vi.spyOn(navigator.usb, "getDevices").mockResolvedValue([matchingDevice]);
//     // requestDeviceは呼ばれないはず
//     const requestSpy = vi.spyOn(navigator.usb, "requestDevice");
//     const reader = await WebUsbCardReader.connect();
//     expect(reader).toBeDefined();
//     expect(requestSpy).not.toHaveBeenCalled();
//   });

//   // 2. getEndPoint内の分岐：複数の "in" エンドポイントがある場合、最後のものが返る
//   it("should return the last matching 'in' endpoint when multiple exist", () => {
//     if (!cardReader) return;
//     // USBデバイスの設定を上書き（2つの"in"エンドポイントを持つように変更）
//     cardReader.usbDevice.configuration.interfaces[
//       cardReader.usbDevice.configuration.configurationValue
//     ] = {
//       alternate: {
//         endpoints: [
//           { direction: "in", endpointNumber: 5, packetSize: 32 },
//           { direction: "in", endpointNumber: 6, packetSize: 64 },
//         ],
//       },
//       interfaceNumber: 1,
//     };
//     cardReader.usbDevice.configuration.configurationValue = 1;
//     const config = (cardReader as any).getUsbConfigration();
//     expect(config.endPointInNum).toBe(6);
//   });

//   // 3. getUsbConfigration: 出力USBエンドポイントが存在しない場合のエラー
//   it("should throw an error if out endpoint is missing in configuration", () => {
//     if (!cardReader) return;
//     // 設定内から "out" エンドポイントを削除
//     cardReader.usbDevice.configuration.interfaces[
//       cardReader.usbDevice.configuration.configurationValue
//     ] = {
//       alternate: {
//         endpoints: [{ direction: "in", endpointNumber: 10, packetSize: 64 }],
//       },
//       interfaceNumber: 2,
//     };
//     expect(() =>
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       (cardReader as any).getUsbConfigration(),
//     ).toThrow("出力USBエンドポイントが取得できませんでした");
//   });

//   // 4. openDevice 内のUSB初期化シーケンスが正しく実行されるか
//   it("should execute the proper openDevice sequence", async () => {
//     if (!cardReader) return;
//     const selectConfigSpy = vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       (cardReader as any).usbDevice,
//       "selectConfiguration",
//     );
//     const claimInterfaceSpy = vi.spyOn(
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       (cardReader as any).usbDevice,
//       "claimInterface",
//     );
//     const sendUsbSpy = vi
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       .spyOn(cardReader as any, "sendUsb")
//       .mockResolvedValue(undefined);
//     const recvUsbSpy = vi
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       .spyOn(cardReader as any, "recvUsb")
//       .mockResolvedValue({ data: new DataView(new ArrayBuffer(64)) });
//     const sleepSpy = vi
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       .spyOn(cardReader as any, "sleep")
//       .mockResolvedValue(undefined);

//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     await (cardReader as any).openDevice();
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     const config = (cardReader as any).getUsbConfigration();
//     expect(selectConfigSpy).toHaveBeenCalledWith(config.confValue);
//     expect(claimInterfaceSpy).toHaveBeenCalledWith(config.interfaceNum);
//     // openDevice内ではsendUsb/recvUsbがそれぞれ5回ずつ呼ばれる（各コマンド毎に）
//     expect(sendUsbSpy).toHaveBeenCalledTimes(5);
//     expect(recvUsbSpy).toHaveBeenCalledTimes(5);
//     expect(sleepSpy).toHaveBeenCalledTimes(3);
//   });

//   // 5. closeDevice 内のUSBクローズシーケンスが正しく実行されるか
//   it("should execute the proper closeDevice sequence", async () => {
//     if (!cardReader) return;
//     const sendUsbSpy = vi
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       .spyOn(cardReader as any, "sendUsb")
//       .mockResolvedValue(undefined);
//     const recvUsbSpy = vi
//       // biome-ignore lint/suspicious/noExplicitAny: testing private method
//       .spyOn(cardReader as any, "recvUsb")
//       .mockResolvedValue({ data: new DataView(new ArrayBuffer(64)) });
//     const releaseInterfaceSpy = vi.spyOn(
//       cardReader.usbDevice,
//       "releaseInterface",
//     );
//     const closeSpy = vi.spyOn(cardReader.usbDevice, "close");

//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     await (cardReader as any).closeDevice();
//     // closeDevice内でturnOffとendTransparentが送信されるはず
//     expect(sendUsbSpy).toHaveBeenNthCalledWith(
//       1,
//       cardReader.s300Commands.turnOff,
//       "Turn Off RF",
//     );
//     expect(sendUsbSpy).toHaveBeenNthCalledWith(
//       2,
//       cardReader.s300Commands.endTransparent,
//       "End Transeparent Session",
//     );

//     const config = (cardReader as any).getUsbConfigration();
//     expect(releaseInterfaceSpy).toHaveBeenCalledWith(config.interfaceNum);
//     expect(closeSpy).toHaveBeenCalled();
//   });

//   // 6. sleep: 指定ミリ秒後にPromiseが解決するか（fake timers を利用）
//   it("should sleep for the specified duration", async () => {
//     if (!cardReader) return;
//     vi.useFakeTimers();
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     const sleepPromise = (cardReader as any).sleep(100);
//     let resolved = false;
//     sleepPromise.then(() => (resolved = true));
//     vi.advanceTimersByTime(100);
//     await sleepPromise;
//     expect(resolved).toBe(true);
//     vi.useRealTimers();
//   });

//   // 7. arrayToHex: Uint8Array を16進数表記へ変換する
//   it("should convert Uint8Array to hex string correctly", () => {
//     if (!cardReader) return;
//     const input = new Uint8Array([0x01, 0x0a, 0xff]);
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     const result = (cardReader as any).arrayToHex(input);
//     expect(result).toBe("01 0A FF ");
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     const trimmed = (cardReader as any).arrayToHex(input, true);
//     expect(trimmed).toBe("010AFF");
//   });

//   // 8. binArrayToHex: DataView を16進数表記へ変換する
//   it("should convert DataView to hex string correctly using binArrayToHex", () => {
//     if (!cardReader) return;
//     const buffer = new ArrayBuffer(3);
//     const view = new DataView(buffer);
//     view.setUint8(0, 0x01);
//     view.setUint8(1, 0x0a);
//     view.setUint8(2, 0xff);
//     // biome-ignore lint/suspicious/noExplicitAny: testing private method
//     const result = (cardReader as any).binArrayToHex(view);
//     expect(result).toBe("01 0A FF ");
//   });

//   // 9. （9つ目の箇所は8つ目と同一の関数）
//   // ※binArrayToHexのテストが既に8でカバーされるため、ここでは追加テストは省略
// });
