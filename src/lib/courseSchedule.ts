export interface CourseScheduleItem {
  id: string;
  courseName: string;
  weekday: number;
  startTime: string;
  endTime: string;
  location: string;
  instructor?: string;
  weeksText?: string;
  notes?: string;
  source: 'ai-import' | 'manual';
}

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

export function formatWeekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? `周${weekday}`;
}

export function createCourseScheduleItem(
  overrides: Partial<CourseScheduleItem> = {},
): CourseScheduleItem {
  return {
    id: overrides.id ?? (crypto.randomUUID?.() ?? `course-${Date.now()}`),
    courseName: overrides.courseName ?? '',
    weekday: overrides.weekday ?? 1,
    startTime: overrides.startTime ?? '08:00',
    endTime: overrides.endTime ?? '09:35',
    location: overrides.location ?? '',
    instructor: overrides.instructor,
    weeksText: overrides.weeksText,
    notes: overrides.notes,
    source: overrides.source ?? 'manual',
  };
}

export function isCourseScheduleItemComplete(item: CourseScheduleItem): boolean {
  return Boolean(item.courseName.trim() && item.startTime && item.endTime);
}

export function getCurrentWeekday(date = new Date()): number {
  const weekday = date.getDay();
  return weekday === 0 ? 7 : weekday;
}

export function sortCourseSchedule(items: CourseScheduleItem[]): CourseScheduleItem[] {
  return [...items].sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday;
    }

    if (left.startTime !== right.startTime) {
      return left.startTime.localeCompare(right.startTime);
    }

    return left.courseName.localeCompare(right.courseName, 'zh-CN');
  });
}

export function buildDailyScheduleText(items: CourseScheduleItem[]): string {
  return sortCourseSchedule(items)
    .map((item) => `${item.startTime} - ${item.endTime} ${item.courseName} (${item.location || '地点待确认'})`)
    .join('\n');
}

export function selectReferenceCourses(
  items: CourseScheduleItem[],
  date = new Date(),
): {
  label: string;
  weekday: number;
  courses: CourseScheduleItem[];
  isToday: boolean;
} | null {
  if (!items.length) {
    return null;
  }

  const currentWeekday = getCurrentWeekday(date);

  for (let offset = 0; offset < 7; offset += 1) {
    const weekday = ((currentWeekday + offset - 1) % 7) + 1;
    const courses = sortCourseSchedule(items.filter((item) => item.weekday === weekday));

    if (courses.length) {
      return {
        label: offset === 0 ? '今天' : `下一个有课日 ${formatWeekdayLabel(weekday)}`,
        weekday,
        courses,
        isToday: offset === 0,
      };
    }
  }

  return null;
}
