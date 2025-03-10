// import type { IUsbConnector } from "./IUsbConnector";

// export class WebUsbConnector implements IUsbConnector {
//   constructor(private usbDevice: USBDevice) {}

//   async open() {
//     await this.usbDevice.open();
//   }

//   async close() {
//     await this.usbDevice.close();
//   }

//   async selectConfiguration(configValue: number) {
//     await this.usbDevice.selectConfiguration(configValue);
//   }

//   async claimInterface(interfaceNumber: number) {
//     await this.usbDevice.claimInterface(interfaceNumber);
//   }

//   async releaseInterface(interfaceNumber: number) {
//     await this.usbDevice.releaseInterface(interfaceNumber);
//   }

//   async transferIn(endpoint: number, length: number) {
//     return this.usbDevice.transferIn(endpoint, length);
//   }

//   async transferOut(endpoint: number, data: Uint8Array) {
//     return this.usbDevice.transferOut(endpoint, data);
//   }

//   get configuration() {
//     return this.usbDevice.configuration;
//   }
// }
