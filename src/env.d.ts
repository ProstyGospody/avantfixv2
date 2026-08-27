interface ImportMetaEnv {
  readonly PUBLIC_METRIKA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    ym?: (id: string | number, action: string, ...args: unknown[]) => void;

    __ymId?: string;
  }
}

export {};
