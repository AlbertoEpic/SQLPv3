/// <reference types="astro/client" />

declare global {
  const __SITE_CONFIG__: any;

  interface Window {
    initializeDocsSidebar?: () => void;
    initializeImageGrids?: () => void;
    initializeHomeGraph?: () => Promise<void>;
    initializeLeafletMaps?: () => void;
  }

  interface ImportMetaEnv {
    readonly GOOGLE_ANALYTICS_ID: string;
    readonly API_KEY: string;
    readonly INSTAFEED_ACCESS_TOKEN: string;
    readonly INSTAGRAM_ACCESS_TOKEN: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module 'mdast' {
  interface Data {
    hProperties?: {
      class?: string;
      style?: string;
    };
  }
}

declare module 'leaflet' {
  namespace control {
    function elevation(options?: Record<string, unknown>): unknown;
  }
}

export {};
