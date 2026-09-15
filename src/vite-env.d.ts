/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_ADSTERRA_DIRECT_LINK?: string;
  readonly VITE_DEFAULT_TIMER_SECONDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
