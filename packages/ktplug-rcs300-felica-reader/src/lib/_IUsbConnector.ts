// export interface IUsbConnector {
//   open(): Promise<void>;
//   close(): Promise<void>;
//   selectConfiguration(configValue: number): Promise<void>;
//   claimInterface(interfaceNumber: number): Promise<void>;
//   releaseInterface(interfaceNumber: number): Promise<void>;
//   transferIn(endpoint: number, length: number): Promise<USBInTransferResult>;
//   transferOut(
//     endpoint: number,
//     data: Uint8Array,
//   ): Promise<USBOutTransferResult>;
//   get configuration(): USBConfiguration | undefined;
// }
