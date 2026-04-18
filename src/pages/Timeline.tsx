import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PathArtwork } from '@/components/EditorialArtwork';
import { buildDailyScheduleText, selectReferenceCourses, type CourseScheduleItem } from '@/lib/courseSchedule';
import { generateSleepSchedule, type SleepScheduleEvent } from '@/lib/sleepScheduler';
import { useAppStore } from '@/store';
import SleepMode from '@/components/SleepMode';

export default function Timeline() {
  const { sleepDebt, transportMode, diningPOI, courseSchedule } = useAppStore();
  const [events, setEvents] = useState<SleepScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSleepMode, setShowSleepMode] = useState(false);
  const referenceSchedule = useMemo(() => selectReferenceCourses(courseSchedule), [courseSchedule]);

  useEffect(() => {
    async function fetchSchedule() {
      if (!referenceSchedule?.courses.length) {
        setEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const scheduleText = buildDailyScheduleText(referenceSchedule.courses);
      const generated = await generateSleepSchedule(scheduleText, sleepDebt, transportMode, diningPOI);

      if (generated && Array.isArray(generated)) {
        setEvents(generated);
      } else {
        setEvents(buildCourseOnlyEvents(referenceSchedule.courses));
      }
      setLoading(false);
    }

    fetchSchedule();
  }, [referenceSchedule, sleepDebt, transportMode, diningPOI]);

  return (
    <div className="mx-auto max-w-4xl">
      <section className="page-canvas paper-panel relative mb-6 overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="ambient-line top-6" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="editorial-kicker">Recovery Timeline</p>
            <h2 className="mt-4 text-balance font-headline text-4xl font-semibold leading-tight text-on-surface sm:text-5xl">
              把一天拆开看，
              <br />
              补觉窗口会更清楚。
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-on-surface-variant">
              {referenceSchedule
                ? <>当前展示的是 <span className="font-semibold text-primary">{referenceSchedule.label}</span> 的课程安排与补觉建议。</>
                : '还没有识别到可用课表，请先回到引导页上传课表截图。'}
            </p>
          </div>

          <div className="rounded-[30px] border border-outline-variant bg-white/70 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="editorial-kicker">Sleep Debt</p>
                <p className="mt-4 text-5xl font-headline font-semibold text-tertiary">
                  {sleepDebt}
                  <span className="ml-1 text-lg font-normal">小时</span>
                </p>
              </div>
              <PathArtwork className="w-28 opacity-85" />
            </div>
            <div className="mt-5 h-3 w-full overflow-hidden rounded-full border border-outline-variant bg-surface-container-low">
              <motion.div
                className="h-full rounded-full bg-tertiary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((sleepDebt / 8) * 100, 100).toFixed(1)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="paper-panel rounded-[28px] p-6 sm:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="editorial-kicker mb-1">Best Place Now</p>
              <h3 className="text-3xl font-headline font-semibold text-primary">宿舍</h3>
            </div>
            <span className="material-symbols-outlined scale-125 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bed</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary-container px-3 py-1 text-[10px] text-on-primary-container">静音模式</span>
            <span className="rounded-full bg-primary-container px-3 py-1 text-[10px] text-on-primary-container">全黑环境</span>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="paper-panel-soft rounded-[24px] p-4">
            <span className="material-symbols-outlined mb-2 text-sm text-on-surface-variant">school</span>
            <p className="text-xs text-on-surface-variant">次选</p>
            <p className="text-lg font-semibold text-on-surface">自习室</p>
          </div>
          <div className="paper-panel-soft rounded-[24px] p-4">
            <span className="material-symbols-outlined mb-2 text-sm text-on-surface-variant">meeting_room</span>
            <p className="text-xs text-on-surface-variant">备选</p>
            <p className="text-lg font-semibold text-on-surface">教室</p>
          </div>
        </div>
      </section>

      <section className="paper-panel rounded-[32px] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-lg font-headline font-semibold">
            <span className="material-symbols-outlined text-primary">schedule</span>
            今日时间轴
          </h3>
          <button
            type="button"
            data-ai-label="查看今日时间轴说明"
            data-ai-context="用户想更快看懂当前时间轴为什么这样安排补觉、通勤和用餐节点。"
            className="rounded-full border border-primary/30 bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary-container"
          >
            查看说明
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-[24px] border border-outline-variant bg-white/64 p-6 text-sm text-on-surface-variant">
            暂时没有可展示的课程时间轴。先在引导页导入课表截图，或者等后续接入地图与地点推荐后再生成完整日程。
          </div>
        ) : (
          <div className="relative space-y-0 pl-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-[2px] before:bg-outline-variant before:content-['']">
            {events.map((event, index) => {
              if (event.type === 'sleep' && event.priority === 'high') {
                return (
                  <div key={index} className="relative pb-10">
                    <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                      <span className="material-symbols-outlined text-[14px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
                    </div>
                    <div className="relative overflow-hidden rounded-[26px] border border-primary bg-primary-container p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-primary">最高优先级</span>
                          <h4 className="mt-1 text-lg font-bold text-primary">{event.startTime} - {event.endTime} {event.title}</h4>
                          <p className="mt-1 text-sm text-on-primary-container">{event.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setShowSleepMode(true)}
                          data-ai-label="从时间轴开启睡眠模式"
                          data-ai-context="这是 AI 规划出的高优先级补觉窗口，用户准备直接开始执行。"
                          className="flex-1 rounded-full bg-primary py-2 text-sm font-bold text-on-primary shadow-[0_18px_32px_rgba(196,110,67,0.16)] transition-transform hover:scale-105 active:scale-95"
                        >
                          开启睡眠模式
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (event.type === 'sleep' && event.priority === 'low') {
                return (
                  <div key={index} className="relative pb-10">
                    <div className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-tertiary ring-4 ring-background" />
                    <div className="rounded-[22px] border border-tertiary bg-tertiary-container p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-tertiary">摸鱼点推荐</span>
                          <h4 className="font-semibold text-on-tertiary-container">{event.startTime} - {event.endTime} {event.title}</h4>
                        </div>
                        <span className="text-xs text-on-tertiary-container/60">低优先级</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="relative pb-10">
                  <div className="absolute -left-[27px] top-1 h-4 w-4 rounded-full border-4 border-background bg-surface-container-highest" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-mono text-xs text-on-surface-variant">{event.startTime} - {event.endTime}</span>
                      <h4 className="mt-1 font-semibold text-on-surface">{event.title}</h4>
                      {event.location ? <p className="mt-1 text-xs text-on-surface-variant">{event.location}</p> : null}
                    </div>
                    {event.type === 'course' && <span className="rounded-full border border-outline-variant bg-white/70 px-2 py-1 text-[10px] text-on-surface-variant">课程</span>}
                    {event.type === 'commute' && <span className="material-symbols-outlined text-sm text-on-surface-variant">directions_walk</span>}
                    {event.type === 'meal' && <span className="material-symbols-outlined text-sm text-on-surface-variant">restaurant</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="paper-panel-soft mt-6 mb-10 rounded-[32px] p-6">
        <h4 className="mb-4 font-headline text-2xl font-semibold text-on-surface">今日补觉建议</h4>
        <ul className="space-y-4">
          <li className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container">
              <span className="material-symbols-outlined text-sm text-secondary">lightbulb</span>
            </div>
            <p className="text-sm text-on-surface-variant">下午补觉前避免摄入过量咖啡因，以免影响夜间睡眠质量。</p>
          </li>
          <li className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container">
              <span className="material-symbols-outlined text-sm text-primary">notifications_off</span>
            </div>
            <p className="text-sm text-on-surface-variant">宿舍补觉时建议佩戴耳塞，走廊环境较为嘈杂。</p>
          </li>
        </ul>
      </section>

      {showSleepMode && <SleepMode onClose={() => setShowSleepMode(false)} />}
    </div>
  );
}

function buildCourseOnlyEvents(courses: CourseScheduleItem[]): SleepScheduleEvent[] {
  return courses.map((course) => ({
    startTime: course.startTime,
    endTime: course.endTime,
    title: course.courseName,
    location: course.location,
    type: 'course',
    description: course.notes,
  }));
}
