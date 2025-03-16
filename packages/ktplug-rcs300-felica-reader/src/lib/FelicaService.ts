import {
  arrayToHex,
  binArrayToHex,
  dataViewToUint8Array,
  hexStringToByteArray,
  sleep,
} from "./utils";

// 各操作の戻り値型定義
export type FelicaPollingResult = {
  idm: string;
  systemCode: string;
};

export type FelicaRequestServiceResult = {
  idm: string;
  nodeCount: string;
  nodeKeyVerList: string;
};

export type FelicaReadWithoutEncryptionResult = {
  idm: string;
  statusFlag1: string;
  statusFlag2: string;
  blockSize: string;
  blockData: string;
};

export class FelicaService {
  private seq = 0;

  // RC-S300 のコマンド定義
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

  constructor(
    public s300: USBDevice,
    private isDebug = false,
  ) {}

  /**
   * デバイスのオープン
   * @returns
   */
  public async openDevice() {
    const { confValue, interfaceNum } = this.getUsbConfigSet();

    await this.s300.open();
    await this.s300.selectConfiguration(confValue); // USBデバイスの構成を選択
    await this.s300.claimInterface(interfaceNum); // USBデバイスの指定インターフェイスを排他アクセスにする

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
    await sleep(50);
    await this.recvUsb(64);
    await sleep(50);

    await this.sendUsb(this.s300Commands.turnOn, "Turn On RF");
    await sleep(50);
    await this.recvUsb(64);
    await sleep(50);

    return;
  }

  /**
   * デバイスのクローズ
   * @returns
   */
  public async closeDevice() {
    const { interfaceNum } = this.getUsbConfigSet();

    await this.sendUsb(this.s300Commands.turnOff, "Turn Off RF");
    await sleep(50);
    await this.recvUsb(64);
    await sleep(50);

    await this.sendUsb(
      this.s300Commands.endTransparent,
      "End Transeparent Session",
    );
    await this.recvUsb(64);

    // USBデバイスの指定インターフェイスを排他アクセスを解放する
    await this.s300.releaseInterface(interfaceNum);
    await this.s300.close();

    return;
  }

  /**
   * PasoRiへの送信
   * @param data
   * @returns
   */
  private async sendUsb(data: Uint8Array, trcMsg = "") {
    /**
     * PasoRiのリクエストヘッダー付与
     */
    const addReqHeader = (argData: Uint8Array) => {
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

    const { endPointOutNum } = this.getUsbConfigSet();
    const reqData = addReqHeader(data);
    await this.s300.transferOut(endPointOutNum, reqData);

    if (this.isDebug) console.log(`${trcMsg} Send: ${arrayToHex(reqData)}`);
  }

  /**
   * PasoRiの応答取得
   * @param rcvLen
   * @returns
   */
  private async recvUsb(rcvLen: number) {
    const { endPointInNum } = this.getUsbConfigSet();
    const res = await this.s300.transferIn(endPointInNum, rcvLen);
    if (this.isDebug) console.log(`Recv: ${binArrayToHex(res.data)}`);
    return res;
  }

  /**
   * Felica のポーリング操作を実行し、IDm とシステムコードを返す。
   */
  public async polling(
    timeoutPerRun = 100,
  ): Promise<FelicaPollingResult | undefined> {
    const pollingCommand = [0x00, 0xff, 0xff, 0x01, 0x00]; // ポーリング コマンド
    const response = await this.felicaOperation(
      pollingCommand,
      timeoutPerRun,
      "Polling",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      systemCode: arrayToHex(new Uint8Array(response.data.slice(16, 18)), true),
    };
  }

  /**
   * Felica の RequestService 操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param nodeCodeList ノードコードの配列（各コードは数値）
   */
  public async requestService(
    idm: string,
    nodeCodeList: number[],
  ): Promise<FelicaRequestServiceResult | undefined> {
    const timeoutPerRun = 100;
    const codeCommand = [0x02];
    if (
      nodeCodeList.length % 2 !== 0 ||
      nodeCodeList.length < 2 ||
      nodeCodeList.length > 64
    ) {
      throw new Error("ノードコードリストの桁数が不適切です");
    }
    const nodeCount = nodeCodeList.length / 2;
    const idmByteArray = hexStringToByteArray(idm);
    const command = codeCommand
      .concat(idmByteArray)
      .concat([nodeCount])
      .concat(nodeCodeList);
    const response = await this.felicaOperation(
      command,
      timeoutPerRun,
      "RequestService",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      nodeCount: arrayToHex(new Uint8Array(response.data.slice(8, 9))),
      nodeKeyVerList: arrayToHex(new Uint8Array(response.data.slice(9))),
    };
  }

  /**
   * Felica の暗号化無しデータ読み取り操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param params 各サービスに対するパラメータの配列
   */
  public async readWithoutEncryption(
    idm: string,
    params: Array<{
      serviceCode: string;
      blockListParam: {
        accessMode: "normal" | "purse-cashback";
        blockNoStart: number;
        blockNoEnd: number;
      };
    }>,
  ): Promise<FelicaReadWithoutEncryptionResult | undefined> {
    const timeoutPerRun = 100;
    if (params.length === 0 || params.length > 16) {
      throw new Error(
        "paramsが不正です。対象のサービスは1〜16個の範囲で指定してください",
      );
    }
    const commandCode = [0x06];
    const idmByteArray = hexStringToByteArray(idm);
    const serviceCount = [params.length];
    const { totalBlockCount, blockList, serviceCodeList } = params.reduce(
      (acc, cur) => {
        if (cur.serviceCode.length !== 4) {
          throw new Error(
            `サービスコードリストの桁数が不適切です:${cur.serviceCode}`,
          );
        }
        acc.serviceCodeList.push(...hexStringToByteArray(cur.serviceCode));
        acc.blockList.push(...this.constructBlockList(cur.blockListParam, 0));
        acc.totalBlockCount +=
          cur.blockListParam.blockNoEnd - cur.blockListParam.blockNoStart + 1;
        return acc;
      },
      {
        totalBlockCount: 0,
        blockList: [] as number[],
        serviceCodeList: [] as number[],
      },
    );

    const readCommand = commandCode
      .concat(idmByteArray)
      .concat(serviceCount)
      .concat(serviceCodeList)
      .concat([totalBlockCount])
      .concat(blockList);
    const response = await this.felicaOperation(
      readCommand,
      timeoutPerRun,
      "ReadWithoutEncryption",
    );
    if (!response) return undefined;
    return {
      idm: arrayToHex(new Uint8Array(response.data.slice(0, 8)), true),
      statusFlag1: arrayToHex(new Uint8Array(response.data.slice(8, 9))),
      statusFlag2: arrayToHex(new Uint8Array(response.data.slice(9, 10))),
      blockSize: arrayToHex(new Uint8Array(response.data.slice(10, 11))),
      blockData: arrayToHex(new Uint8Array(response.data.slice(11)), true),
    };
  }

  /**
   * Felica コマンドをラップし、送受信、レスポンスの解析までを行う。
   */
  private async felicaOperation(
    felicaCommand: number[],
    timeout: number,
    description: string,
  ): Promise<
    { length: number; responseCode: number; data: number[] } | undefined
  > {
    const wrappedCommand = await this.wrapCTXIns(felicaCommand, timeout);
    await this.sendUsb(wrappedCommand, description);
    const cTXResponse = await this.recvUsb(64);
    return this.unwrapCTXResponse(cTXResponse);
  }

  /**
   * Felica コマンドを RC-S300 の communicateThruEX 命令形式にラップする。
   */
  private async wrapCTXIns(
    felicaCommand: number[],
    timeout: number,
  ): Promise<Uint8Array> {
    const communicateThruEX = [0xff, 0x50, 0x00, 0x01, 0x00];
    const communicateThruEXFooter = [0x00, 0x00, 0x00];
    const felicaHeader = [0x5f, 0x46, 0x04];
    const felicaOption = [0x95, 0x82];
    const felicaTimeout = timeout * 1000; // マイクロ秒（リトルエンディアン）

    const felicaCommandLength = felicaCommand.length + 1;
    const felicaReq: number[] = [...felicaHeader];
    felicaReq.push(
      felicaTimeout & 0xff,
      (felicaTimeout >> 8) & 0xff,
      (felicaTimeout >> 16) & 0xff,
      (felicaTimeout >> 24) & 0xff,
    );
    felicaReq.push(...felicaOption);
    felicaReq.push(
      (felicaCommandLength >> 8) & 0xff,
      felicaCommandLength & 0xff,
    );
    felicaReq.push(felicaCommandLength);
    felicaReq.push(...felicaCommand);
    const felicaReqLen = felicaReq.length;
    const cTX: number[] = [...communicateThruEX];
    cTX.push((felicaReqLen >> 8) & 0xff, felicaReqLen & 0xff);
    cTX.push(...felicaReq);
    cTX.push(...communicateThruEXFooter);
    return new Uint8Array(cTX);
  }

  /**
   * communicateThruEX レスポンスから Felica 応答データを取り出す。
   */
  private unwrapCTXResponse(
    cTXResponse: USBInTransferResult,
  ): { length: number; responseCode: number; data: number[] } | undefined {
    if (!cTXResponse.data) return undefined;
    const data = dataViewToUint8Array(cTXResponse.data);
    const idx = data.indexOf(0x97);
    if (idx < 0) return undefined;
    const lenIndex = idx + 1;
    const length = data[lenIndex];
    const allData = Array.from(data.slice(lenIndex + 1, lenIndex + 1 + length));
    return {
      length,
      responseCode: allData[1],
      data: allData.slice(2),
    };
  }

  /**
   * ブロックリストを構成する。
   * @param param ブロック範囲とアクセスモード
   * @param serviceListOrder サービスリスト内の順序
   */
  private constructBlockList(
    param: {
      accessMode: "normal" | "purse-cashback";
      blockNoStart: number;
      blockNoEnd: number;
    },
    serviceListOrder: number,
  ): number[] {
    if (param.blockNoEnd > 0xffff) throw new Error("blockCountが不正です");
    if (serviceListOrder > 0xff) throw new Error("serviceListOrderが不正です");
    const blockSize = param.blockNoEnd > 0xff ? 3 : 2;
    let d0 = 0;
    if (blockSize === 2) d0 += 0b10000000;
    if (param.accessMode === "purse-cashback") d0 += 0b00010000;
    d0 += serviceListOrder;
    const result: number[] = [];
    for (let i = param.blockNoStart; i <= param.blockNoEnd; i++) {
      const blkListElement = new Uint8Array(blockSize);
      blkListElement[0] = d0;
      blkListElement[1] = i & 0xff;
      if (blockSize === 3) {
        blkListElement[2] = (i >> 8) & 0xff;
      }
      result.push(...blkListElement);
    }
    return result;
  }

  /**
   * USB設定の取得
   * @returns
   */
  private getUsbConfigSet() {
    const getEndPoint = (usbIf: USBInterface, direction: USBDirection) =>
      usbIf.alternate.endpoints.find((ep) => ep.direction === direction);

    if (!this.s300.configuration) throw new Error("configurationがありません");

    const usbConf = this.s300.configuration;
    const usbIf = usbConf.interfaces[usbConf.configurationValue];

    const inEp = getEndPoint(usbIf, "in");
    if (!inEp) throw new Error("入力USBエンドポイントが取得できませんでした");

    const outEp = getEndPoint(usbIf, "out");
    if (!outEp) throw new Error("出力USBエンドポイントが取得できませんでした");

    return {
      confValue: usbConf.configurationValue,
      interfaceNum: usbIf.interfaceNumber,
      endPointInNum: inEp.endpointNumber,
      endPointInPacketSize: inEp.packetSize,
      endPointOutNum: outEp.endpointNumber,
      endPointOutPacketSize: outEp.packetSize,
    };
  }
}
