import {
  buildLlmHeaders,
  extractContentFromOpenAICompatibleResponse,
  getLlmConfig,
  getOpenAICompatibleChatUrl,
} from '@/lib/llmConfig';

export type AiInsightTone = 'gentle' | 'active' | 'caution';

export interface AiButtonInsightRequest {
  actionId?: string;
  actionLabel: string;
  actionContext?: string;
  pageTitle: string;
  pagePath: string;
  appFacts: string[];
}

export interface AiButtonInsight {
  title: string;
  summary: string;
  suggestions: string[];
  tone: AiInsightTone;
  source: 'model' | 'fallback';
}

const BUTTON_AI_TIMEOUT_MS = 20_000;

export async function requestAiButtonInsight(
  request: AiButtonInsightRequest,
  signal?: AbortSignal,
): Promise<AiButtonInsight> {
  const config = getLlmConfig();

  if (
    config.mode !== 'openai-compatible' ||
    !config.apiUrl ||
    !config.model
  ) {
    return buildFallbackInsight(request);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), BUTTON_AI_TIMEOUT_MS);
  const abortHandler = () => controller.abort();
  signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    const response = await fetch(getOpenAICompatibleChatUrl(config.apiUrl), {
      method: 'POST',
      headers: buildLlmHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个嵌入校园睡眠应用里的中文操作提示助手。你只根据按钮点击、页面和状态，产出简短、具体、像产品内实时反馈一样的中文 JSON。不要输出 Markdown，不要解释，不要道歉。',
          },
          {
            role: 'user',
            content: buildInsightPrompt(request),
          },
        ],
        temperature: 0.35,
      }),
    });

    if (!response.ok) {
      console.error('[button ai] API request failed.', response.status, response.statusText);
      return buildFallbackInsight(request);
    }

    const data = (await response.json()) as unknown;
    const content = extractContentFromOpenAICompatibleResponse(data);
    if (!content) {
      return buildFallbackInsight(request);
    }

    const parsed = parseInsight(content);
    return parsed
      ? {
          ...parsed,
          source: 'model',
        }
      : buildFallbackInsight(request);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('[button ai] Failed to generate insight.', error);
    }
    return buildFallbackInsight(request);
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortHandler);
  }
}

function buildInsightPrompt(request: AiButtonInsightRequest): string {
  return `
当前页面：${request.pageTitle} (${request.pagePath})
按钮名称：${request.actionLabel}
动作 ID：${request.actionId ?? 'unknown'}
按钮上下文：${request.actionContext ?? '无额外说明'}
应用状态：
${request.appFacts.map((item) => `- ${item}`).join('\n')}

请输出一个 JSON 对象，结构如下：
{
  "title": "8-12 个汉字以内的短标题",
  "summary": "1-2 句中文，说明这次点击接下来会带来什么，40-80 字",
  "suggestions": ["最多 3 条短句", "每条不超过 18 个汉字"],
  "tone": "gentle 或 active 或 caution"
}

要求：
1. 用简体中文。
2. 重点说明“这个按钮点击后，对今天补觉/路线/课表/个人设置有什么影响”。
3. 如果按钮和删除、退出、恢复默认、取消有关，要提醒影响。
4. 如果按钮和睡眠、课表、食堂、交通、地图、个人偏好有关，要自然带入上下文。
5. 只返回 JSON 对象，不要有任何额外文字。
  `.trim();
}

function parseInsight(content: string): Omit<AiButtonInsight, 'source'> | null {
  const payload = parseJsonPayload(content);
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const title = normalizeShortText(data.title, 18);
  const summary = normalizeShortText(data.summary, 120);
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions
        .flatMap((item) => (typeof item === 'string' ? [item.trim()] : []))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const tone = normalizeTone(data.tone);

  if (!title || !summary) {
    return null;
  }

  return {
    title,
    summary,
    suggestions,
    tone,
  };
}

function parseJsonPayload(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeShortText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function normalizeTone(value: unknown): AiInsightTone {
  if (value === 'active' || value === 'caution' || value === 'gentle') {
    return value;
  }

  return 'gentle';
}

function buildFallbackInsight(request: AiButtonInsightRequest): AiButtonInsight {
  const label = request.actionLabel;
  const context = request.actionContext ?? '';

  if (matches(label, ['上传', '识别', 'OCR', '课表'])) {
    return {
      title: '开始读取课表',
      summary: '这次点击会先整理截图里的课程、时间和地点，再把结果交给你做最后校对。',
      suggestions: ['上传整周视图', '识别后先校对地点', '保存后再生成时间轴'],
      tone: 'active',
      source: 'fallback',
    };
  }

  if (matches(label, ['保存记录', '保存校准', '保存', '完成设置'])) {
    return {
      title: '已同步新状态',
      summary: '这次修改会立刻进入当前状态，后续作息建议、路线卡片和页面提示都会按新数据更新。',
      suggestions: ['检查是否已持久化', '回到首页看目标', '时间轴会跟着变化'],
      tone: 'active',
      source: 'fallback',
    };
  }

  if (matches(label, ['睡眠', '小睡', '休息', '减压'])) {
    return {
      title: '先缓一缓',
      summary: '这个动作会把注意力切回恢复状态，优先围绕你的欠眠时长和当前节奏给出更合适的休息建议。',
      suggestions: ['优先补短缺时段', '避免睡太久起昏沉', '结束后会写入记录'],
      tone: 'gentle',
      source: 'fallback',
    };
  }

  if (matches(label, ['删除', '退出', '恢复默认', '取消'])) {
    return {
      title: '先确认一下',
      summary: '这是一个会撤回、重置或离开当前状态的动作，建议先确认它会不会影响后续课表、偏好或睡眠记录。',
      suggestions: ['先确认影响范围', '必要时保留副本', '避免误删已校准数据'],
      tone: 'caution',
      source: 'fallback',
    };
  }

  if (matches(label, ['食堂', '地点', '路线', '交通', '地图']) || matches(context, ['食堂', '路线', '交通'])) {
    return {
      title: '正在更新动线',
      summary: '这个点击会更新你在校园里的移动偏好，后续路线、干饭节点和补觉空档都会按这条动线重新理解。',
      suggestions: ['看下个节点变化', '食堂偏好会联动', '地图页结果会更新'],
      tone: 'active',
      source: 'fallback',
    };
  }

  if (matches(label, ['编辑', '资料', '设置', '帮助', '关于', '评分'])) {
    return {
      title: '这项设置会生效',
      summary: '这个入口会结合你当前页面和作息状态，补一条更清楚的说明，方便判断下一步怎么调。',
      suggestions: ['优先保留关键偏好', '减少重复配置', '后续页面会复用'],
      tone: 'gentle',
      source: 'fallback',
    };
  }

  return {
    title: '已记录这次操作',
    summary: `刚刚点击的「${label}」会结合 ${request.pageTitle} 页面和当前状态，补一条即时说明。`,
    suggestions: ['可继续点击别的按钮', '结果会随状态变化', '服务异常时会本地说明'],
    tone: 'gentle',
    source: 'fallback',
  };
}

function matches(value: string, fragments: string[]): boolean {
  return fragments.some((fragment) => value.includes(fragment));
}
