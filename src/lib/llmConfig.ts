export type LlmMode = 'mock' | 'openai-compatible' | 'custom';

export interface LlmConfig {
  mode: LlmMode;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  visionModel?: string;
  authScheme: string;
  extraHeaders: Record<string, string>;
}

export function getLlmConfig(): LlmConfig {
  return {
    mode: (import.meta.env.VITE_SLEEP_SCHEDULER_MODE ?? 'openai-compatible') as LlmMode,
    apiUrl: import.meta.env.VITE_LLM_API_URL,
    apiKey: import.meta.env.VITE_LLM_API_KEY,
    model: import.meta.env.VITE_LLM_MODEL,
    visionModel: import.meta.env.VITE_LLM_VISION_MODEL ?? import.meta.env.VITE_LLM_MODEL,
    authScheme: import.meta.env.VITE_LLM_AUTH_SCHEME ?? 'Bearer',
    extraHeaders: parseExtraHeaders(import.meta.env.VITE_LLM_EXTRA_HEADERS),
  };
}

export function buildLlmHeaders(config: LlmConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.extraHeaders,
  };

  if (config.apiKey) {
    headers.Authorization = `${config.authScheme} ${config.apiKey}`;
  }

  return headers;
}

export function getOpenAICompatibleChatUrl(apiUrl: string): string {
  const normalized = apiUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

export function extractContentFromOpenAICompatibleResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('choices' in data) || !Array.isArray(data.choices)) {
    return null;
  }

  const message = data.choices[0]?.message;
  const content = message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        if ('type' in part && part.type === 'text' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join('')
      .trim();

    return text || null;
  }

  return null;
}

function parseExtraHeaders(headers: string | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  try {
    const parsed = JSON.parse(headers) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : [],
      ),
    );
  } catch (error) {
    console.warn('[llm config] Failed to parse VITE_LLM_EXTRA_HEADERS.', error);
    return {};
  }
}
