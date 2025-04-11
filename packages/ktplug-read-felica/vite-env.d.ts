/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBUSB_DEBUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
