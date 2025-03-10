import { FelicaService } from "./FeliCaService";
import { sleep } from "./utils";

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
  /**
   * constructor (private)
   * @param usbDevice
   */
  private constructor(public felicaService: FelicaService) {}

  /**
   * デバイスに接続
   * @returns
   */
  static async connect(isDebug = false) {
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
          break;
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

    return new WebUsbCardReader(new FelicaService(usbDevice, isDebug));
  }

  /**
   * IDm読み取り
   * @returns
   */
  public async polling(maxTryCount = 10) {
    let tryCount = 0;
    let response: Awaited<ReturnType<typeof this.felicaService.polling>> =
      undefined;

    try {
      while (!response && tryCount < maxTryCount) {
        tryCount++;
        await this.felicaService.openDevice();
        response = await this.felicaService.polling();
        await this.felicaService.closeDevice();
        if (!response) await sleep(1000);
      }
    } catch (e: unknown) {
      if (this.felicaService.s300.opened)
        await this.felicaService.closeDevice();
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

      await this.felicaService.openDevice();
      const result = await this.felicaService.requestService(
        pollingResponse.idm,
        nodeCodeList,
      );
      await this.felicaService.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.felicaService.s300.opened)
        await this.felicaService.closeDevice();
      throw e;
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

      await this.felicaService.openDevice();
      const result = await this.felicaService.readWithoutEncryption(
        pollingResponse.idm,
        params,
      );
      await this.felicaService.closeDevice();
      // this.felicaService.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.felicaService.s300.opened)
        await this.felicaService.closeDevice();
      if (e instanceof Error) {
        alert(e.message);
      }
    }
  }
}
