/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Üyelik sorgulama; backend MEMBERSHIP_INQUIRY_TOKEN ile aynı olmalı */
  readonly VITE_MEMBERSHIP_INQUIRY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

