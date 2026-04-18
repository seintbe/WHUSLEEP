import { requestCustomSleepSchedule } from '@/lib/customSleepScheduler';
import {
  buildLlmHeaders,
  extractContentFromOpenAICompatibleResponse,
  getLlmConfig,
  getOpenAICompatibleChatUrl,
  type LlmConfig,
} from '@/lib/llmConfig';

export type SleepScheduleEventType = 'course' | 'commute' | 'meal' | 'sleep' | 'other';
export type SleepSchedulePriority = 'high' | 'medium' | 'low';

export interface SleepScheduleEvent {
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  type: SleepScheduleEventType;
  priority?: SleepSchedulePriority;
  description?: string;
}

export interface SleepScheduleRequest {
  schedule: string;
  sleepDebt: number;
  transportMode: string;
  diningPOI: string;
}

export type SleepScheduleResponse = SleepScheduleEvent[] | null;

function buildPrompt({ schedule, sleepDebt, transportMode, diningPOI }: SleepScheduleRequest) {
  return `
You are an intelligent sleep scheduling assistant for a university student.
The student has a sleep debt of ${sleepDebt} hours.
Their preferred transport mode is: ${transportMode} (walking, ebike, or bus).
Their preferred dining location is: ${diningPOI}.

Here is their basic class schedule for today:
${schedule}

Your task:
1. Analyze the free time slots between classes, meals, and commute.
2. Allocate the ${sleepDebt} hours of sleep debt into these free slots based on the following location priorities:
   - Priority 1: Dormitory (宿舍) - Best for long, deep sleep.
   - Priority 2: Desk/Study Room (自习室) - Good for naps.
   - Priority 3: Classroom (教室) - Acceptable for quick rests.
   - Priority 4: Slacking off/Other (摸鱼) - Lowest priority.
3. Return a JSON array of scheduled events for the day, including classes, meals, commute, and the newly injected sleep slots.

The JSON should be an array of objects with this structure:
{
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "title": "Event Title",
  "location": "Location Name",
  "type": "course" | "commute" | "meal" | "sleep" | "other",
  "priority": "high" | "medium" | "low" (only for sleep slots),
  "description": "Short description or advice"
}

Ensure the timeline is chronological and makes logical sense (e.g., commute before meal, sleep in dorm requires commute to dorm).
Return ONLY valid JSON.
  `.trim();
}

function normalizeScheduleEvents(payload: unknown): SleepScheduleResponse {
  if (!Array.isArray(payload)) {
    return null;
  }

  const events = payload.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const event = item as Record<string, unknown>;
    const { startTime, endTime, title, location, type, priority, description } = event;

    if (
      typeof startTime !== 'string' ||
      typeof endTime !== 'string' ||
      typeof title !== 'string' ||
      typeof location !== 'string' ||
      !isEventType(type)
    ) {
      return [];
    }

    return [
      {
        startTime,
        endTime,
        title,
        location,
        type,
        priority: isPriority(priority) ? priority : undefined,
        description: typeof description === 'string' ? description : undefined,
      } satisfies SleepScheduleEvent,
    ];
  });

  return events.length ? events : null;
}

function isEventType(value: unknown): value is SleepScheduleEventType {
  return value === 'course' || value === 'commute' || value === 'meal' || value === 'sleep' || value === 'other';
}

function isPriority(value: unknown): value is SleepSchedulePriority {
  return value === 'high' || value === 'medium' || value === 'low';
}

function parseJsonArray(text: string): SleepScheduleResponse {
  try {
    return normalizeScheduleEvents(JSON.parse(text));
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return null;
    }

    try {
      return normalizeScheduleEvents(JSON.parse(match[0]));
    } catch {
      return null;
    }
  }
}

async function requestOpenAICompatibleSchedule(
  request: SleepScheduleRequest,
  config: LlmConfig,
): Promise<SleepScheduleResponse> {
  if (!config.apiUrl || !config.model) {
    console.warn('[sleep scheduler] Missing VITE_LLM_API_URL or VITE_LLM_MODEL. Falling back to local schedule.');
    return null;
  }

  const response = await fetch(getOpenAICompatibleChatUrl(config.apiUrl), {
    method: 'POST',
    headers: buildLlmHeaders(config),
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a precise assistant that returns valid JSON only.',
        },
        {
          role: 'user',
          content: buildPrompt(request),
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    console.error('[sleep scheduler] API request failed.', response.status, response.statusText);
    return null;
  }

  const data = (await response.json()) as unknown;
  const text = extractContentFromOpenAICompatibleResponse(data);

  if (!text) {
    console.error('[sleep scheduler] Response did not contain a readable message content.');
    return null;
  }

  return parseJsonArray(text);
}

export async function generateSleepSchedule(
  schedule: string,
  sleepDebt: number,
  transportMode: string,
  diningPOI: string,
): Promise<SleepScheduleResponse> {
  const request: SleepScheduleRequest = {
    schedule,
    sleepDebt,
    transportMode,
    diningPOI,
  };
  const config = getLlmConfig();

  try {
    if (config.mode === 'mock') {
      return null;
    }

    if (config.mode === 'custom') {
      return requestCustomSleepSchedule(request, config);
    }

    return requestOpenAICompatibleSchedule(request, config);
  } catch (error) {
    console.error('[sleep scheduler] Failed to generate schedule.', error);
    return null;
  }
}
