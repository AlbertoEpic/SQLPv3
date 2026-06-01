/// <reference types="astro/client" />

declare global {
  const __SITE_CONFIG__: any;

  interface Window {
    initializeDocsSidebar?: () => void;
    initializeImageGalleries?: () => void;
    initializeImageGrids?: () => void;
  }
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
