/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SLEEP_SCHEDULER_MODE?: 'mock' | 'openai-compatible' | 'custom';
  readonly VITE_LLM_API_URL?: string;
  readonly VITE_LLM_API_KEY?: string;
  readonly VITE_LLM_MODEL?: string;
  readonly VITE_LLM_VISION_MODEL?: string;
  readonly VITE_LLM_AUTH_SCHEME?: string;
  readonly VITE_LLM_EXTRA_HEADERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
