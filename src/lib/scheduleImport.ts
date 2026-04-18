import {
  buildLlmHeaders,
  extractContentFromOpenAICompatibleResponse,
  getLlmConfig,
  getOpenAICompatibleChatUrl,
} from '@/lib/llmConfig';
import { type CourseScheduleItem } from '@/lib/courseSchedule';

export interface ScheduleImportResult {
  courses: CourseScheduleItem[];
}

const OCR_REQUEST_TIMEOUT_MS = 90_000;

export type ScheduleImportStage = 'preparing' | 'uploading' | 'parsing';

interface ScheduleImportOptions {
  onProgress?: (stage: ScheduleImportStage) => void;
}

interface RawImportedCourse {
  courseName?: unknown;
  title?: unknown;
  name?: unknown;
  weekday?: unknown;
  dayOfWeek?: unknown;
  weekdayLabel?: unknown;
  startTime?: unknown;
  start?: unknown;
  endTime?: unknown;
  end?: unknown;
  location?: unknown;
  classroom?: unknown;
  instructor?: unknown;
  teacher?: unknown;
  weeksText?: unknown;
  weeks?: unknown;
  notes?: unknown;
}

export async function extractCourseScheduleFromImage(
  file: File,
  options: ScheduleImportOptions = {},
): Promise<ScheduleImportResult> {
  const config = getLlmConfig();

  if (config.mode === 'mock') {
    throw new Error('当前是 mock 模式，无法发起真实的 OCR 识别请求。');
  }

  if (!config.apiUrl || !config.visionModel) {
    throw new Error('缺少 OCR 模型配置，请检查 VITE_LLM_API_URL 和 VITE_LLM_VISION_MODEL。');
  }

  options.onProgress?.('preparing');
  const imageDataUrl = await readFileAsDataUrl(file);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), OCR_REQUEST_TIMEOUT_MS);

  try {
    options.onProgress?.('uploading');
    const response = await fetch(getOpenAICompatibleChatUrl(config.apiUrl), {
      method: 'POST',
      headers: buildLlmHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({
        model: config.visionModel,
        messages: [
          {
            role: 'system',
            content: 'You extract structured course schedules from timetable images and return valid JSON only.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: buildScheduleImportPrompt(),
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('[schedule import] API request failed.', response.status, response.statusText);
      throw new Error(`OCR 接口调用失败（${response.status} ${response.statusText}）。`);
    }

    const data = (await response.json()) as unknown;
    options.onProgress?.('parsing');
    const content = extractContentFromOpenAICompatibleResponse(data);

    if (!content) {
      console.error('[schedule import] Response did not contain a readable message content.');
      throw new Error('OCR 接口返回成功，但没有拿到可解析的文本结果。');
    }

    if (looksLikeImageWasIgnored(content)) {
      throw new Error('当前 API 的 OpenAI 兼容层没有正确接收图片输入，课表 OCR 暂时不可用。');
    }

    const courses = parseImportedCourses(content);
    if (!courses.length) {
      throw new Error('OCR 没有识别出有效课程，请换一张更清晰的课表截图。');
    }

    return { courses };
  } catch (error) {
    console.error('[schedule import] Failed to extract course schedule.', error);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('OCR 识别超时了，请稍后重试，或换一张更清晰、更小的图片。');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('OCR 识别失败，请稍后重试。');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildScheduleImportPrompt(): string {
  return `
请识别这张课程表/教务截图，并输出结构化 JSON。

要求：
1. 只提取真实课程，不要输出空白格子、装饰元素、页眉页脚。
2. 输出每一门课在一周中的具体出现项；如果同一门课在不同天/不同时间出现，要分别输出。
3. weekday 使用数字 1-7，分别代表周一到周日。
4. startTime 和 endTime 必须是 24 小时制 HH:MM。
5. 请重点观察屏幕左侧的时间轴。每个课程色块在纵向上的起点和终点，需要与左侧时间刻度严格对齐，再据此推断该节课的 startTime 和 endTime。
6. 如果一个课程色块跨越多个小节，请根据它覆盖的完整时间范围输出，不要只取中间某一行文字。
7. location 要尽量提取完整的教学楼/教室信息，例如“3区 1-402”“4区 5-302”。如果课程块里同时出现课程名、老师名、教室名，请把教室单独放到 location。
8. 教室通常出现在课程块靠下的位置，可能和老师姓名分行显示。请特别留意每堂课最后一两行中的楼栋、区号、房间号。
9. 如果课程块里的文字颜色浅、被压缩换行、或者同一块内有多行信息，也要尽量完整识别课程名和教室。
10. instructor、weeksText、notes 没有就输出空字符串。
11. 如果课程表是中文大学课表，优先保持中文课程名和地点原文。
12. 如果无法百分百确定教室，也请输出你能识别到的最接近原文，不要凭空编造。
13. 返回格式必须是一个 JSON 对象，结构如下：
{
  "courses": [
    {
      "courseName": "课程名",
      "weekday": 1,
      "startTime": "08:00",
      "endTime": "09:35",
      "location": "教三-101",
      "instructor": "",
      "weeksText": "",
      "notes": ""
    }
  ]
}

只返回合法 JSON，不要解释。
  `.trim();
}

function parseImportedCourses(content: string): CourseScheduleItem[] {
  const payload = parseJsonPayload(content);
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const rawCourses = Array.isArray((payload as { courses?: unknown }).courses)
    ? (payload as { courses: RawImportedCourse[] }).courses
    : Array.isArray(payload)
      ? (payload as RawImportedCourse[])
      : [];

  const dedupe = new Set<string>();

  return rawCourses.flatMap((rawCourse, index) => {
    const normalized = normalizeImportedCourse(rawCourse, index);
    if (!normalized) {
      return [];
    }

    const key = [
      normalized.weekday,
      normalized.startTime,
      normalized.endTime,
      normalized.courseName,
      normalized.location,
    ].join('|');

    if (dedupe.has(key)) {
      return [];
    }

    dedupe.add(key);
    return [normalized];
  });
}

function normalizeImportedCourse(rawCourse: RawImportedCourse, index: number): CourseScheduleItem | null {
  const courseName = pickString(rawCourse.courseName, rawCourse.title, rawCourse.name);
  const weekday = normalizeWeekday(rawCourse.weekday ?? rawCourse.dayOfWeek ?? rawCourse.weekdayLabel);
  const startTime = normalizeTime(rawCourse.startTime ?? rawCourse.start);
  const endTime = normalizeTime(rawCourse.endTime ?? rawCourse.end);

  if (!courseName || !weekday || !startTime || !endTime) {
    return null;
  }

  const location = pickString(rawCourse.location, rawCourse.classroom) ?? '';
  const instructor = pickString(rawCourse.instructor, rawCourse.teacher) ?? '';
  const weeksText = pickString(rawCourse.weeksText, rawCourse.weeks) ?? '';
  const notes = pickString(rawCourse.notes) ?? '';

  return {
    id: crypto.randomUUID?.() ?? `${weekday}-${startTime}-${index}`,
    courseName,
    weekday,
    startTime,
    endTime,
    location,
    instructor: instructor || undefined,
    weeksText: weeksText || undefined,
    notes: notes || undefined,
    source: 'ai-import',
  };
}

function parseJsonPayload(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
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

function normalizeWeekday(value: unknown): number | null {
  if (typeof value === 'number' && value >= 1 && value <= 7) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  const map: Record<string, number> = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '周一': 1,
    '星期一': 1,
    '周二': 2,
    '星期二': 2,
    '周三': 3,
    '星期三': 3,
    '周四': 4,
    '星期四': 4,
    '周五': 5,
    '星期五': 5,
    '周六': 6,
    '星期六': 6,
    '周日': 7,
    '星期日': 7,
    '星期天': 7,
  };

  return map[normalized] ?? null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})[:：](\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read file as data URL.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function looksLikeImageWasIgnored(content: string): boolean {
  const normalized = content.toLowerCase();

  return (
    normalized.includes("attach the image") ||
    normalized.includes("provide the image") ||
    normalized.includes("image you\u2019d like me to describe") ||
    normalized.includes("image you’d like me to describe") ||
    normalized.includes("image you would like me to describe") ||
    normalized.includes("please share the image") ||
    normalized.includes("please provide the image") ||
    normalized.includes("please upload") ||
    normalized.includes("i don\u2019t see any image") ||
    normalized.includes("i don’t see any image") ||
    normalized.includes("i cannot see") ||
    normalized.includes("no image was") ||
    normalized.includes("\u8bf7\u4e0a\u4f20\u56fe\u7247") ||
    normalized.includes("\u8bf7\u63d0\u4f9b\u56fe\u7247") ||
    normalized.includes("\u6ca1\u6709\u770b\u5230\u56fe\u7247") ||
    normalized.includes("\u6ca1\u6709\u6536\u5230\u56fe\u7247") ||
    normalized.includes("\u65e0\u6cd5\u770b\u5230\u56fe\u7247") ||
    normalized.includes("\u672a\u6536\u5230\u56fe")
  );
}
