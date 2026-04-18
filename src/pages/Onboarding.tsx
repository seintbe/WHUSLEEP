import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCourseScheduleItem,
  formatWeekdayLabel,
  isCourseScheduleItemComplete,
  sortCourseSchedule,
  type CourseScheduleItem,
} from '@/lib/courseSchedule';
import CampusDiningSelector from '@/components/CampusDiningSelector';
import { PathArtwork, SleepArtwork } from '@/components/EditorialArtwork';
import { extractCourseScheduleFromImage } from '@/lib/scheduleImport';
import { useAppStore } from '@/store';

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

export default function Onboarding() {
  const {
    transportMode,
    setTransportMode,
    diningPOI,
    setDiningPOI,
    customDiningPois,
    addCustomDiningPoi,
    removeCustomDiningPoi,
    courseSchedule,
    scheduleImported,
    setCourseSchedule,
  } = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [lastImportedFileName, setLastImportedFileName] = useState('');
  const [draftCourses, setDraftCourses] = useState<CourseScheduleItem[]>(courseSchedule);
  const [calibrationNotice, setCalibrationNotice] = useState('');
  const [importStage, setImportStage] = useState<'preparing' | 'uploading' | 'parsing'>('preparing');

  useEffect(() => {
    setDraftCourses(courseSchedule);
  }, [courseSchedule]);

  const hasDraftCourses = draftCourses.length > 0;
  const hasValidDraftCourses = draftCourses.some(isCourseScheduleItemComplete);
  const hasUnsavedCalibration = useMemo(() => {
    return JSON.stringify(sortCourseSchedule(draftCourses)) !== JSON.stringify(sortCourseSchedule(courseSchedule));
  }, [draftCourses, courseSchedule]);

  const handleComplete = () => {
    if (!scheduleImported) {
      setImportError('请先上传课表图片、完成 OCR 校准并保存课表。');
      return;
    }

    if (hasUnsavedCalibration) {
      setImportError('你还有未保存的校准结果，先点击“保存校准后的课表”。');
      return;
    }

    navigate('/');
  };

  const handleScheduleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportStage('preparing');
    setImportError('');
    setLastImportedFileName(file.name);
    setCalibrationNotice('');

    try {
      const result = await extractCourseScheduleFromImage(file, {
        onProgress: (stage) => setImportStage(stage),
      });
      setDraftCourses(sortCourseSchedule(result.courses));
      setCalibrationNotice('OCR 识别完成。请先校对星期、时间和地点，再保存为正式课表。');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'OCR 识别失败，请稍后重试。');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDraftCourseChange = (
    courseId: string,
    field: keyof Pick<CourseScheduleItem, 'courseName' | 'weekday' | 'startTime' | 'endTime' | 'location'>,
    value: string,
  ) => {
    setDraftCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              [field]: field === 'weekday' ? Number(value) : value,
            }
          : course,
      ),
    );
  };

  const handleRemoveDraftCourse = (courseId: string) => {
    setDraftCourses((current) => current.filter((course) => course.id !== courseId));
  };

  const handleAddDraftCourse = () => {
    setDraftCourses((current) => [...current, createCourseScheduleItem()]);
  };

  const handleSaveCalibration = () => {
    const cleanedCourses = sortCourseSchedule(
      draftCourses
        .map((course) => ({
          ...course,
          courseName: course.courseName.trim(),
          location: course.location.trim(),
          startTime: course.startTime.trim(),
          endTime: course.endTime.trim(),
        }))
        .filter(isCourseScheduleItemComplete),
    );

    if (!cleanedCourses.length) {
      setImportError('至少保留一条完整课程后，才能保存校准结果。');
      return;
    }

    setCourseSchedule(cleanedCourses);
    setDraftCourses(cleanedCourses);
    setImportError('');
    setCalibrationNotice('校准结果已保存，后续时间轴会直接使用这份课表。');
  };

  const handleResetDraft = () => {
    setDraftCourses(courseSchedule);
    setImportError('');
    setCalibrationNotice('已恢复到上次保存的课表版本。');
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Hero Section */}
      <section className="page-canvas paper-panel relative mb-10 overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="ambient-line top-6" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="editorial-kicker">Calm Setup</p>
            <h2 className="mt-4 text-balance font-headline text-4xl font-semibold leading-tight text-on-surface sm:text-5xl">
              先把校园节奏整理好，
              <br />
              再开始睡得更稳。
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">
              这里会收集课表、出行方式和常去食堂，后面所有补觉建议与路线安排都会沿用这套信息。逻辑不变，只把体验整理得更清楚、更舒服。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-outline-variant bg-white/60 px-3 py-1.5 text-xs text-on-surface-variant">课表 OCR 校准</span>
              <span className="rounded-full border border-outline-variant bg-white/60 px-3 py-1.5 text-xs text-on-surface-variant">校园路线共用</span>
              <span className="rounded-full border border-outline-variant bg-white/60 px-3 py-1.5 text-xs text-on-surface-variant">补觉建议个性化</span>
            </div>
          </div>
          <div className="relative">
            <SleepArtwork className="mx-auto max-w-[320px] opacity-95" />
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {/* Step 1 */}
        <section className="paper-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary">calendar_month</span>
              <span className="text-sm font-label tracking-widest text-secondary uppercase">步骤 01</span>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-start">
              <div>
                <h3 className="text-3xl font-headline font-semibold text-on-surface">导入课表</h3>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                  上传教务系统课表截图，系统会自动整理课程名、星期、时间和地点。
                </p>
              </div>
              <div className="hidden lg:block">
                <PathArtwork className="ml-auto max-w-[220px]" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScheduleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              data-ai-label={scheduleImported ? '重新导入课表截图' : '上传课表截图并识别'}
              data-ai-context="这里会调用多模态模型识别课表中的课程、时间和地点，识别后还需要人工校准。"
              className="editorial-shadow mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-bold text-on-primary transition-transform active:scale-95"
              disabled={isImporting}
            >
              <span className="material-symbols-outlined">upload_file</span>
              <span>{isImporting ? '识别中...' : scheduleImported ? '重新导入课表截图' : '上传课表截图并识别'}</span>
            </button>
            <p className="mt-3 text-xs text-on-surface-variant">当前优先支持武汉大学课表截图，建议上传清晰、完整的整周视图。</p>

            {lastImportedFileName && (
              <div className="mt-5 rounded-[24px] border border-outline-variant bg-white/60 p-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-primary">image</span>
                  <span className="font-medium text-on-surface">最近上传：{lastImportedFileName}</span>
                </div>
                {calibrationNotice ? (
                  <div className="mt-4 rounded-2xl bg-primary-container px-4 py-3 text-sm text-on-primary-container">
                    {calibrationNotice}
                  </div>
                ) : null}
                {importError ? (
                  <div className="mt-4 rounded-2xl bg-error-container px-4 py-3 text-sm text-error">
                    <p>{importError}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      data-ai-label="重新上传课表再试一次"
                      data-ai-context="上一轮 OCR 识别失败，用户希望重新触发多模态课表识别。"
                      className="mt-3 rounded-full bg-error px-3 py-1 text-xs font-bold text-on-error"
                    >
                      重新上传再试一次
                    </button>
                  </div>
                ) : null}
                {hasDraftCourses ? (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-on-surface">当前草稿共 {draftCourses.length} 节课程</p>
                    <div className="mt-3 space-y-2">
                      {draftCourses.slice(0, 4).map((course) => (
                        <div key={course.id} className="rounded-2xl bg-surface px-3 py-3 text-sm">
                          <p className="font-medium text-on-surface">{course.courseName}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {formatWeekdayLabel(course.weekday)} {course.startTime} - {course.endTime}
                            {course.location ? ` · ${course.location}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        </section>

        {hasDraftCourses ? (
          <section className="paper-panel rounded-[32px] p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-secondary">edit_calendar</span>
              <span className="text-sm font-label tracking-widest text-secondary uppercase">步骤 01A</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-headline font-bold">校准 OCR 结果</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  这里是识别后的课表草稿。把识别错的课程名、星期、时间、地点修正好，再保存成正式课表。
                </p>
              </div>
              {hasUnsavedCalibration ? (
                <span className="rounded-full bg-tertiary-container px-3 py-1 text-xs font-bold text-on-tertiary-container">
                  待保存
                </span>
              ) : (
                <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">
                  已同步
                </span>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {calibrationNotice && hasDraftCourses ? (
                <div className="rounded-2xl bg-primary-container px-4 py-3 text-sm text-on-primary-container">
                  {calibrationNotice}
                </div>
              ) : null}
              {importError && hasDraftCourses ? (
                <div className="rounded-2xl bg-error-container px-4 py-3 text-sm text-error">
                  {importError}
                </div>
              ) : null}
              {draftCourses.map((course) => (
                <div key={course.id} className="rounded-[24px] border border-outline-variant bg-white/72 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant mb-2">课程名</label>
                      <input
                        type="text"
                        value={course.courseName}
                        onChange={(event) => handleDraftCourseChange(course.id, 'courseName', event.target.value)}
                        className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="例如：高等数学"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-2">星期</label>
                      <select
                        value={course.weekday}
                        onChange={(event) => handleDraftCourseChange(course.id, 'weekday', event.target.value)}
                        className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {WEEKDAY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-2">地点</label>
                      <input
                        type="text"
                        value={course.location}
                        onChange={(event) => handleDraftCourseChange(course.id, 'location', event.target.value)}
                        className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="例如：三教 302"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-2">开始时间</label>
                      <input
                        type="time"
                        value={course.startTime}
                        onChange={(event) => handleDraftCourseChange(course.id, 'startTime', event.target.value)}
                        className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant mb-2">结束时间</label>
                      <input
                        type="time"
                        value={course.endTime}
                        onChange={(event) => handleDraftCourseChange(course.id, 'endTime', event.target.value)}
                        className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">
                      {formatWeekdayLabel(course.weekday)} {course.startTime} - {course.endTime}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftCourse(course.id)}
                      data-ai-label={`删除课程 ${course.courseName || '未命名课程'}`}
                      data-ai-context="用户正在清理 OCR 草稿中的课程项，这会影响后续保存的正式课表。"
                      className="rounded-full bg-error-container px-3 py-1 text-xs font-bold text-error"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddDraftCourse}
                data-ai-label="手动新增一节课"
                data-ai-context="用户准备手动补充 OCR 没识别出的课程，正式课表会把这节课纳入时间轴。"
                className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-bold text-on-surface"
              >
                手动新增一节课
              </button>
              <button
                type="button"
                onClick={handleSaveCalibration}
                data-ai-label="保存校准后的课表"
                data-ai-context="用户已经修正 OCR 草稿，保存后首页、时间轴和路线页都会使用这份正式课表。"
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
                disabled={!hasValidDraftCourses}
              >
                保存校准后的课表
              </button>
              <button
                type="button"
                onClick={handleResetDraft}
                data-ai-label="恢复到已保存版本"
                data-ai-context="用户打算放弃当前未保存的 OCR 校准草稿，恢复到上次正式保存的课表。"
                className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-bold text-on-surface"
                disabled={!courseSchedule.length}
              >
                恢复到已保存版本
              </button>
            </div>
          </section>
        ) : null}

        {/* Step 2 */}
        <section className="paper-panel rounded-[32px] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-secondary">commute</span>
            <span className="text-sm font-label tracking-widest text-secondary uppercase">步骤 02</span>
          </div>
          <h3 className="text-3xl font-headline font-semibold mb-3 text-on-surface">日常交通方式</h3>
          <p className="mb-6 text-sm leading-7 text-on-surface-variant">选择你最常用的校园移动方式，后续时间轴和路线卡片会沿用这条偏好。</p>
          <div className="grid grid-cols-1 gap-4">
            {[
              { id: 'walking', icon: 'directions_walk', title: '步行', desc: '适合校内近距离移动' },
              { id: 'ebike', icon: 'moped', title: '电动车', desc: '高效穿越整个校区' },
              { id: 'bus', icon: 'directions_bus', title: '校巴', desc: '定时定点，适合长途跨区' },
            ].map((mode) => (
              <button
                type="button"
                key={mode.id}
                onClick={() => setTransportMode(mode.id)}
                data-ai-label={`选择交通方式：${mode.title}`}
                data-ai-context="交通方式会影响时间轴里的通勤安排、地图页路线估算和操作提示对校园动线的解读。"
                className={`flex items-center justify-between rounded-[24px] border p-5 text-left transition-colors ${
                  transportMode === mode.id ? 'bg-white border-primary shadow-[0_18px_38px_rgba(83,58,34,0.08)]' : 'bg-white/58 border-outline-variant hover:bg-white/76'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    transportMode === mode.id ? 'bg-surface-container-low' : 'bg-surface-container-lowest'
                  }`}>
                    <span className={`material-symbols-outlined ${transportMode === mode.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {mode.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold">{mode.title}</h4>
                    <p className="text-xs text-on-surface-variant">{mode.desc}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  transportMode === mode.id ? 'border-primary' : 'border-outline-variant'
                }`}>
                  {transportMode === mode.id && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3 */}
        <section className="paper-panel rounded-[32px] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-secondary">restaurant</span>
            <span className="text-sm font-label tracking-widest text-secondary uppercase">步骤 03</span>
          </div>
          <h3 className="text-3xl font-headline font-semibold mb-4 text-on-surface">偏好干饭地点</h3>
          <p className="text-on-surface-variant mb-6 text-sm leading-7">直接在真实地图上选食堂，后面的路线页会复用同一套点位，不再是演示占位。</p>
          <CampusDiningSelector
            value={diningPOI}
            onChange={setDiningPOI}
            customPois={customDiningPois}
            onAddCustomPoi={addCustomDiningPoi}
            onRemoveCustomPoi={removeCustomDiningPoi}
          />
        </section>
      </div>

      <div className="mt-12 pb-12">
        <button 
          type="button"
          onClick={handleComplete}
          data-ai-label="完成设置并进入主流程"
          data-ai-context="用户准备结束引导页配置，系统将带着课表、交通偏好和食堂偏好进入正式补觉流程。"
          className="w-full rounded-full bg-tertiary px-6 py-5 text-lg font-extrabold tracking-widest text-on-tertiary transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_18px_44px_rgba(210,161,83,0.22)] hover:brightness-105"
          disabled={!scheduleImported || isImporting}
        >
          完成设置 进入梦境
        </button>
        <p className="text-center mt-4 text-xs text-on-surface-variant/60">先完成课表识别，再进入后续补觉规划。</p>
      </div>

      {isImporting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] px-6 backdrop-blur-sm">
          <div className="paper-panel w-full max-w-md rounded-[32px] p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            </div>
            <h3 className="mt-5 text-center text-2xl font-bold text-on-surface">正在识别课表</h3>
            <p className="mt-2 text-center text-sm text-on-surface-variant">
              {importStage === 'preparing' && '正在读取图片并准备处理。'}
              {importStage === 'uploading' && '正在识别课表内容，请稍等几秒。'}
              {importStage === 'parsing' && '识别结果已返回，正在整理课程结构。'}
            </p>

            <div className="mt-6 space-y-3">
              <ProgressRow
                label="读取图片"
                done={importStage === 'uploading' || importStage === 'parsing'}
                active={importStage === 'preparing'}
              />
              <ProgressRow
                label="内容识别"
                done={importStage === 'parsing'}
                active={importStage === 'uploading'}
              />
              <ProgressRow
                label="解析课程"
                done={false}
                active={importStage === 'parsing'}
              />
            </div>

            <p className="mt-6 text-center text-xs text-on-surface-variant">
              如果超过 90 秒还没有结果，系统会自动结束本次识别并提示你重试。
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProgressRow({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      {done ? (
        <span className="material-symbols-outlined text-primary">check_circle</span>
      ) : active ? (
        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
      ) : (
        <span className="material-symbols-outlined text-outline-variant">radio_button_unchecked</span>
      )}
    </div>
  );
}
