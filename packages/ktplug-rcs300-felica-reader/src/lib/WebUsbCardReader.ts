export type BlockListParam = {
  accessMode: "normal" | "purse-cashback";
  blockNoStart: number;
  blockNoEnd: number;
};

export type ReadServiceParam = {
  serviceCode: string;
  blockListParam: BlockListParam;
};

export class WebUsbCardReader {
  // 処理連番
  private seq = 0;

  private s300Commands = {
    startransparent: new Uint8Array([
      0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00,
    ]),
    turnOn: new Uint8Array([0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]),
    endTransparent: new Uint8Array([
      0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00,
    ]),
    turnOff: new Uint8Array([0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]),
  };

  /**
   * constructor (private)
   * @param usbDevice
   */
  private constructor(
    private usbDevice: USBDevice,
    private isDebug = false,
  ) {}

  /**
   * デバイスに接続
   * @returns
   */
  static async connect(isDebug?: boolean) {
    const deviceFilters: USBDeviceFilter[] = [
      { vendorId: 1356, productId: 3528 }, // SONY PaSoRi RC-S300/S
      { vendorId: 1356, productId: 3529 }, // SONY PaSoRi RC-S300/P
    ];

    let usbDevice: USBDevice | undefined = undefined;

    // ペアリング設定済みデバイスのUSBDeviceインスタンス取得
    const ud = await navigator.usb.getDevices();
    if (ud.length > 0) {
      for (const dev of ud) {
        const td = deviceFilters.find(
          (deviceFilter) =>
            dev.vendorId === deviceFilter.vendorId &&
            dev.productId === deviceFilter.productId,
        );
        if (td !== undefined) {
          usbDevice = dev;
        }
      }
    }

    // USB機器をペアリングフローから選択しデバイスのUSBDeviceインスタンス取得
    if (!usbDevice) {
      try {
        usbDevice = await navigator.usb.requestDevice({
          filters: deviceFilters,
        });
      } catch (e: unknown) {
        if (!(e instanceof DOMException)) throw e;
        return undefined;
      }
    }

    return new WebUsbCardReader(usbDevice, isDebug);
  }

  /**
   * USB設定の取得
   * @returns
   */
  private getUsbConfigration() {
    const getEndPoint = (argInterface: USBInterface, argVal: "in" | "out") => {
      let retVal: USBEndpoint | undefined = undefined;
      for (const val of argInterface.alternate.endpoints) {
        if (val.direction === argVal) {
          retVal = val;
        }
      }
      return retVal;
    };

    if (!this.usbDevice.configuration)
      throw new Error("configurationがありません");

    const inEndpoint = getEndPoint(
      this.usbDevice.configuration.interfaces[
        this.usbDevice.configuration.configurationValue
      ],
      "in",
    );
    if (!inEndpoint)
      throw new Error("入力USBエンドポイントが取得できませんでした");

    const outEndpoint = getEndPoint(
      this.usbDevice.configuration.interfaces[
        this.usbDevice.configuration.configurationValue
      ],
      "out",
    );
    if (!outEndpoint)
      throw new Error("出力USBエンドポイントが取得できませんでした");

    return {
      confValue: this.usbDevice.configuration.configurationValue,
      interfaceNum:
        this.usbDevice.configuration.interfaces[
          this.usbDevice.configuration.configurationValue
        ].interfaceNumber, // インターフェイス番号
      endPointInNum: inEndpoint.endpointNumber,
      endPointInPacketSize: inEndpoint.packetSize,
      endPointOutNum: outEndpoint.endpointNumber,
      endPointOutPacketSize: outEndpoint.packetSize,
    };
  }

  /**
   * デバイスのオープン
   * @returns
   */
  private async openDevice() {
    const usbConfiguration = this.getUsbConfigration();

    await this.usbDevice.open();
    await this.usbDevice.selectConfiguration(usbConfiguration.confValue); // USBデバイスの構成を選択
    await this.usbDevice.claimInterface(usbConfiguration.interfaceNum); // USBデバイスの指定インターフェイスを排他アクセスにする

    await this.sendUsb(
      this.s300Commands.endTransparent,
      "End Transeparent Session",
    );
    await this.recvUsb(64);

    await this.sendUsb(
      this.s300Commands.startransparent,
      "Start Transeparent Session",
    );
    await this.recvUsb(64);

    await this.sendUsb(this.s300Commands.turnOff, "Turn Off RF");
    await this.sleep(50);
    await this.recvUsb(64);
    await this.sleep(50);

    await this.sendUsb(this.s300Commands.turnOn, "Turn On RF");
    await this.sleep(50);
    await this.recvUsb(64);
    await this.sleep(50);

    return;
  }

  /**
   * デバイスのクローズ
   * @returns
   */
  private async closeDevice() {
    const usbConfiguration = this.getUsbConfigration();

    await this.sendUsb(this.s300Commands.turnOff, "Turn Off RF");
    await this.sleep(50);
    await this.recvUsb(64);
    await this.sleep(50);

    await this.sendUsb(
      this.s300Commands.endTransparent,
      "End Transeparent Session",
    );
    await this.recvUsb(64);

    await this.usbDevice.releaseInterface(usbConfiguration.interfaceNum); // USBデバイスの指定インターフェイスを排他アクセスを解放する
    await this.usbDevice.close(); // USBデバイスセッション終了

    return;
  }

  /**
   * スリープ
   * @param msec
   * @returns
   */
  private async sleep(msec: number) {
    return new Promise((resolve) => setTimeout(resolve, msec));
  }

  /**
   * UInt8Arrayを16進数表記へ変換
   * @param argData
   * @returns
   */
  private arrayToHex(argData: Uint8Array, trim = false) {
    let retVal = "";
    for (const val of argData) {
      let str = val.toString(16);
      str = val < 0x10 ? `0${str}` : str;
      retVal += `${str.toUpperCase()} `;
    }
    if (trim) {
      return retVal.replaceAll(" ", "");
    }
    return retVal;
  }

  /**
   * DataViewをUInt8Arrayへ変換
   * @param argData
   * @returns
   */
  private binArrayToHex(argData: DataView | undefined) {
    if (!argData) return "";

    let retVal = "";
    for (let idx = 0; idx < argData.byteLength; idx++) {
      const bt = argData.getUint8(idx);
      let str = bt.toString(16);
      str = bt < 0x10 ? `0${str}` : str;
      retVal += `${str.toUpperCase()} `;
    }
    return retVal;
  }

  /**
   * Dataviewから配列への変換
   * @param argData
   * @returns
   */
  private dataviewToArray = (argData: DataView) => {
    // new Uint8Array([])
    const retVal = new Uint8Array(argData.byteLength);
    for (let i = 0; i < argData.byteLength; ++i) {
      retVal[i] = argData.getUint8(i);
    }
    return retVal;
  };

  /**
   * 16進数の文字列を1バイトずつ数値の配列に変換
   * @param hexString
   * @returns
   */
  private hexStringToByteArray(hexString: string): number[] {
    if (!/^([0-9a-fA-F]{2})+$/.test(hexString)) {
      throw new Error(
        "Invalid input. The string must be hexadecimal characters .",
      );
    }

    const byteArray: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
      const byte = hexString.slice(i, i + 2);
      byteArray.push(Number.parseInt(byte, 16));
    }
    return byteArray;
  }

  /**
   * PasoRiのリクエストヘッダー付与
   * @param argData
   * @returns
   */
  private addReqHeader = (argData: Uint8Array) => {
    const dataLen = argData.length;
    const SLOTNUMBER = 0x00;

    const retVal = new Uint8Array(10 + dataLen);

    retVal[0] = 0x6b; // ヘッダー作成
    retVal[1] = 255 & dataLen; // length をリトルエンディアン
    retVal[2] = (dataLen >> 8) & 255;
    retVal[3] = (dataLen >> 16) & 255;
    retVal[4] = (dataLen >> 24) & 255;
    retVal[5] = SLOTNUMBER; // タイムスロット番号
    retVal[6] = ++this.seq; // 認識番号

    0 !== dataLen && retVal.set(argData, 10); // コマンド追加

    return retVal;
  };

  /**
   * PasoRiへの送信操作
   * @param argLength
   * @returns
   */
  private async sendUsb(argData: Uint8Array, argProc = "") {
    const usbConfiguration = this.getUsbConfigration();
    const rdData = this.addReqHeader(argData);
    await this.usbDevice.transferOut(usbConfiguration.endPointOutNum, rdData);

    if (this.isDebug) {
      console.log(argProc);
      console.log(`Send:${this.arrayToHex(rdData)}`);
    }
  }

  /**
   * PasoRiの応答取得
   * @param argLength
   * @returns
   */
  private async recvUsb(argLength: number) {
    const usbConfiguration = this.getUsbConfigration();
    const res = await this.usbDevice.transferIn(
      usbConfiguration.endPointInNum,
      argLength,
    );

    if (this.isDebug) {
      const resStr = this.binArrayToHex(res.data);
      console.log(`Recieve : ${resStr}`);
    }

    return res;
  }

  /**
   * FeliCaのポーリング操作
   * @returns
   */
  private async felicaPolling() {
    const timeoutPerRun = 100;
    const pollingCommand = [0x00, 0xff, 0xff, 0x01, 0x00]; // ポーリング コマンド

    const response = await this.felicaOperation(
      pollingCommand,
      timeoutPerRun,
      "polling",
    );

    if (!response) return undefined;

    return {
      idm: this.arrayToHex(response.data.slice(0, 8), true),
      systemCode: this.arrayToHex(response.data.slice(16, 18), true),
    };
  }

  /**
   * FeliCa RequestService
   * @returns
   */
  private async felicaRequestService(idm: string, nodeCodeList: number[]) {
    const timeoutPerRun = 100;
    const codeCommand = [0x02];
    if (
      nodeCodeList.length % 2 !== 0 ||
      nodeCodeList.length < 2 ||
      nodeCodeList.length > 64
    )
      throw new Error("ノードコードリストの桁数が不適切です");
    const nodeCount = nodeCodeList.length / 2;

    const command = codeCommand
      .concat(this.hexStringToByteArray(idm))
      .concat([nodeCount])
      .concat(nodeCodeList);

    const response = await this.felicaOperation(
      command,
      timeoutPerRun,
      "RequestService",
    );

    if (!response) return undefined;

    return {
      idm: this.arrayToHex(response.data.slice(0, 8), true),
      nodeCount: this.arrayToHex(response.data.slice(8, 9)),
      nodeKeyVerList: this.arrayToHex(response.data.slice(9)),
    };
  }

  /**
   * ブロックリストの構成
   * @param param
   * @param serviceListOrder
   * @returns
   */
  private constructBlkList(param: BlockListParam, serviceListOrder: number) {
    if (param.blockNoEnd > 0xffff) throw new Error("blockCountが不正です");
    if (serviceListOrder > 0xff) throw new Error("serviceListOrderが不正です");

    const blockSize = param.blockNoEnd > 0xff ? 3 : 2;

    let d0 = 0b00000000;
    if (blockSize === 2) d0 += 0b10000000;
    if (param.accessMode === "purse-cashback") d0 += 0b00010000;
    d0 += serviceListOrder;

    const result: number[] = [];
    for (let i = param.blockNoStart; i <= param.blockNoEnd; i++) {
      const blkListElement = new Uint8Array(blockSize);
      blkListElement[0] = d0;
      blkListElement[1] = i & 0xff; // 下位バイト
      if (blockSize === 3) {
        blkListElement[2] = (i >> 8) & 0xff; // 上位バイト
      }
      result.push(...blkListElement);
    }
    return result;
  }

  /**
   * FeliCaのデータ読み取り（暗号化なし）
   * @returns
   */
  private async felicaReadWithoutEncryption(
    idm: string,
    params: ReadServiceParam[],
  ) {
    const timeoutPerRun = 100;

    if (params.length === 0 || params.length > 16)
      throw new Error(
        "paramsが不正です。対象のサービスは1〜16個の範囲で指定してください",
      );

    // コマンドコード
    const commandCode = [0x06];
    // IDm
    const idmByteArray = this.hexStringToByteArray(idm);
    // サービス数
    const serviceCount = [params.length];
    // サービスコードリストを構成
    const serviceCodeList = params.reduce((acc, cur) => {
      if (cur.serviceCode.length !== 4)
        throw new Error(
          `サービスコードリストの桁数が不適切です:${cur.serviceCode}`,
        );
      acc.push(...this.hexStringToByteArray(cur.serviceCode));
      return acc;
    }, [] as number[]);
    // ブロック数、ブロックリストを構成
    const { blockCount, blockList } = params.reduce(
      (acc, cur, idx) => {
        const blocks = this.constructBlkList(
          {
            accessMode: cur.blockListParam.accessMode,
            blockNoStart: cur.blockListParam.blockNoStart,
            blockNoEnd: cur.blockListParam.blockNoEnd,
          },
          idx,
        );
        return {
          blockList: acc.blockList.concat(blocks),
          blockCount:
            acc.blockCount +
            cur.blockListParam.blockNoEnd -
            cur.blockListParam.blockNoStart +
            1,
        };
      },
      { blockList: [], blockCount: 0 } as {
        blockList: number[];
        blockCount: number;
      },
    );

    const readWithoutEncryptionCommand = commandCode
      .concat(idmByteArray)
      .concat(serviceCount)
      .concat(serviceCodeList)
      .concat([blockCount])
      .concat(blockList);

    const response = await this.felicaOperation(
      readWithoutEncryptionCommand,
      timeoutPerRun,
      "ReadWithoutEncryption",
    );

    if (!response) return undefined;

    return {
      idm: this.arrayToHex(response.data.slice(0, 8), true),
      statusFlag1: this.arrayToHex(response.data.slice(8, 9)),
      statusFlag2: this.arrayToHex(response.data.slice(9, 10)),
      blockSize: this.arrayToHex(response.data.slice(10, 11)),
      blockData: this.arrayToHex(response.data.slice(11), true),
    };
  }

  /**
   * FeliCaの操作
   * @returns
   */
  private async felicaOperation(
    felicaCommand: number[],
    timeout: number,
    description: string,
  ) {
    const wrappedCommand = await this.wrapCTXIns(felicaCommand, timeout);
    await this.sendUsb(wrappedCommand, description);
    const cTXResponse = await this.recvUsb(64);
    return await this.unwrapCTXResponse(cTXResponse);
  }

  /**
   * PasoriのcommunicateThruEX命令内に、FeliCaコマンドを埋め込む
   * @param felicaCommand FeliCaコマンド
   * @param timeout タイムアウト（ミリ秒）
   * @returns
   */
  private async wrapCTXIns(felicaCommand: number[], timeout: number) {
    const communicateThruEX = [0xff, 0x50, 0x00, 0x01, 0x00]; // RC-S300 コマンド　communicateThruEX
    const communicateThruEXFooter = [0x00, 0x00, 0x00]; // RC-S300 コマンド　communicateThruEX フッター
    const felicaHeader = [0x5f, 0x46, 0x04]; // FeliCa リクエストヘッダー
    const felicaOption = [0x95, 0x82]; // FeliCa リクエストオプション
    const felicaTimeout = timeout * 1e3; // タイムアウト(マイクロ秒)

    const felicaCommandLength = felicaCommand.length + 1;

    // FeliCa Lite-S リクエストヘッダーを付加
    const felicaReq = [...felicaHeader]; // リクエストヘッダー
    felicaReq.push(
      255 & felicaTimeout,
      (felicaTimeout >> 8) & 255,
      (felicaTimeout >> 16) & 255,
      (felicaTimeout >> 24) & 255,
    ); // タイムアウト <<リトルエンディアン>> 4バイト
    felicaReq.push(...felicaOption);
    felicaReq.push((felicaCommandLength >> 8) & 255, 255 & felicaCommandLength); // コマンドレングス
    felicaReq.push(felicaCommandLength); // リクエストコマンド
    felicaReq.push(...felicaCommand); // リクエストコマンド

    // communicateThruEX コマンド作成
    const felicaReqLen = felicaReq.length;
    const cTX = [...communicateThruEX];
    cTX.push((felicaReqLen >> 8) & 255, 255 & felicaReqLen); // リクエストレングス
    cTX.push(...felicaReq);
    cTX.push(...communicateThruEXFooter);

    return new Uint8Array(cTX);
  }

  /**
   * communicateThruEX レスポンスからFeliCa応答データを取り出す
   * @param cTXResponse
   * @returns
   */
  private async unwrapCTXResponse(cTXResponse: USBInTransferResult) {
    // データがない場合は終了
    if (!cTXResponse.data) return undefined;

    // レスポンスデータから 0x97 の位置を求める
    // (0x97 の次にデータ長が設定されている) ※128バイト以上は未考慮
    const data = this.dataviewToArray(cTXResponse.data);
    const v = data.indexOf(0x97);
    if (v < 0) return undefined;

    // データ長の情報からレスポンスコードとデータを切り分けて返す
    const w = v + 1;
    const length = data[w];
    const allData = data.slice(w + 1, w + 1 + length);
    return {
      length: length,
      responseCode: allData[1],
      data: allData.slice(2, allData.length + 1),
    };
  }

  /**
   * IDm読み取り
   * @returns
   */
  public async polling(maxTryCount = 10) {
    let tryCount = 0;
    let response: Awaited<ReturnType<typeof this.felicaPolling>> = undefined;

    try {
      while (!response && tryCount < maxTryCount) {
        tryCount++;
        await this.openDevice();
        response = await this.felicaPolling();
        await this.closeDevice();
        if (!response) await this.sleep(1000);
      }
    } catch (e: unknown) {
      if (this.usbDevice.opened) await this.closeDevice();
      throw e;
    }

    return response;
  }

  /**
   * Service確認
   * @returns
   */
  public async requestService(nodeCodeList: number[]) {
    try {
      const pollingResponse = await this.polling();

      if (!pollingResponse) {
        return undefined;
      }

      await this.openDevice();
      const result = await this.felicaRequestService(
        pollingResponse.idm,
        nodeCodeList,
      );
      await this.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.usbDevice.opened) await this.closeDevice();
      if (e instanceof Error) {
        alert(e.message);
        console.error(e.message);
      }
    }
  }

  /**
   * データ読み取り（暗号化無し）
   * @returns
   */
  public async readWithoutEncryption(params: ReadServiceParam[]) {
    try {
      const pollingResponse = await this.polling();

      if (!pollingResponse) {
        return undefined;
      }

      await this.openDevice();
      const result = await this.felicaReadWithoutEncryption(
        pollingResponse.idm,
        params,
      );
      await this.closeDevice();
      // this.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.usbDevice.opened) await this.closeDevice();
      if (e instanceof Error) {
        alert(e.message);
      }
    }
  }
}
