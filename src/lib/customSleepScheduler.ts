import type { SleepScheduleRequest, SleepScheduleResponse } from '@/lib/sleepScheduler';

interface CustomSchedulerConfig {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
}

export async function requestCustomSleepSchedule(
  request: SleepScheduleRequest,
  config: CustomSchedulerConfig,
): Promise<SleepScheduleResponse> {
  // Bug 3 Fix: 原实现静默返回 null，导致 custom 模式无声失败且用户毫无感知。
  // 改为 throw Error，使错误出现在控制台并触发上层的 catch → console.error，
  // 让开发者能明确发现此处需要实现，而不是神秘地得到空时间轴。
  void config;
  void request;
  throw new Error(
    '[sleep scheduler] custom 模式尚未实现。请编辑 src/lib/customSleepScheduler.ts，实现你自己的 API 调用逻辑。',
  );
}
