import { type FormEvent, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PathArtwork, SleepArtwork } from '@/components/EditorialArtwork';
import SleepMode from '@/components/SleepMode';
import SocialStats from '@/components/SocialStats';
import { getDailyQuote } from '@/lib/layFlatQuotes';
import { startHeartbeat, stopHeartbeat } from '@/lib/presence';
import { useAppStore } from '@/store';

export default function Home() {
  const navigate = useNavigate();
  const { sleepDebt, sleepData, addSleepData, getTotalRepayment, getTodayTarget, customTargetTime, setCustomTargetTime } = useAppStore();
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<'good' | 'average' | 'poor'>('average');
  const [showSleepMode, setShowSleepMode] = useState(false);
  const [showTargetTimeModal, setShowTargetTimeModal] = useState(false);
  // Bug 10 Fix: targetTime 不能在 useState 初始化时一次性定住。
  // 改为在打开 modal 时实时从 getTodayTarget() 同步，确保 sleepDebt 变化后能反映新目标。
  const [targetTime, setTargetTime] = useState('');

  const handleOpenTargetModal = () => {
    // 每次打开 modal 都重新计算（若用户没设置自定义时间则取动态计算值）
    setTargetTime(getTodayTarget());
    setShowTargetTimeModal(true);
  };
  const [showRelaxGuideModal, setShowRelaxGuideModal] = useState(false);
  const dailyQuote = getDailyQuote();

  useEffect(() => {
    startHeartbeat(() => sleepDebt);
    return () => stopHeartbeat();
  }, [sleepDebt]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(sleepHours);
    if (!isNaN(hours) && hours > 0 && hours <= 24) {
      addSleepData({ hours, quality: sleepQuality });
      setSleepHours('');
      setSleepQuality('average');
    }
  };

  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
      const sleepRecord = sleepData.find((item) => item.date === dateStr);
      data.push({
        date: dayName,
        hours: sleepRecord ? sleepRecord.hours : 0,
      });
    }
    return data;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className="page-canvas paper-panel relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="ambient-line top-6" />
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="editorial-kicker">Daily Recovery</p>
            <h2 className="mt-4 text-balance font-headline text-4xl font-semibold leading-tight text-on-surface sm:text-5xl">
              今天还差一点睡眠，
              <br />
              但节奏已经能慢下来了。
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">
              你今天的睡眠缺口、目标时间和最近状态都在这里。保留原来的记录逻辑，只把信息组织成更容易扫读的顺序。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-outline-variant bg-white/68 px-4 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">今日目标</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{customTargetTime ?? getTodayTarget()}</p>
              </div>
              <div className="rounded-full border border-outline-variant bg-white/68 px-4 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">累计偿还</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{getTotalRepayment().toFixed(1)} 小时</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr] lg:grid-cols-1">
            <div className="relative flex min-h-[280px] items-center justify-center rounded-[32px] border border-outline-variant bg-white/72 p-6">
              <SleepArtwork className="absolute right-0 top-1 max-w-[250px] opacity-85" />
              <div className="relative z-10 flex h-60 w-60 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(196,110,67,0.12)"
                    strokeWidth="7"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="var(--color-tertiary)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 300' }}
                    animate={{ strokeDasharray: `${(sleepDebt / 8) * 283} 300` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="text-center">
                  <p className="mb-1 text-sm text-on-surface-variant">今日睡眠缺口</p>
                  <h2 className="flex items-baseline justify-center gap-1 font-headline text-6xl font-semibold text-tertiary">
                    {sleepDebt}
                    <span className="text-xl font-normal">小时</span>
                  </h2>
                </div>
              </div>
            </div>

            <div className="paper-panel-soft rounded-[28px] p-5">
              <p className="editorial-kicker">Tonight Note</p>
              <p className="mt-4 text-xl font-headline leading-9 text-on-surface">
                “今晚早睡一小时，把透支的活力补回来。”
              </p>
              <div className="mt-5 flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                <span className="text-sm font-semibold">修复建议已为你准备好</span>
              </div>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-8 rounded-[24px] bg-secondary-container p-6"
        >
          <p className="mb-2 text-sm font-semibold text-secondary">今日躺平语录</p>
          <p className="text-lg font-headline leading-7 text-on-surface">
            "{dailyQuote}"
          </p>
        </motion.div>
      </section>

      <SocialStats sleepDebt={sleepDebt} />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="paper-panel rounded-[32px] p-6 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="editorial-kicker">Log Sleep</p>
              <h3 className="mt-3 text-3xl font-headline font-semibold text-on-surface">记录睡眠时间</h3>
            </div>
            <div className="hidden sm:block">
              <PathArtwork className="w-28 opacity-80" />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold text-on-surface-variant">睡眠时长（小时）</label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="w-full rounded-2xl border border-outline bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如：7.5"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold text-on-surface-variant">睡眠质量</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSleepQuality('good')}
                  data-ai-label="选择睡眠质量为良好"
                  data-ai-context="用户正在填写一条新的睡眠记录，质量选择会影响后续 AI 对恢复状态的解读。"
                  className={`flex-1 rounded-2xl py-2.5 text-xs font-bold ${sleepQuality === 'good' ? 'bg-primary text-on-primary' : 'border border-outline bg-surface text-on-surface'}`}
                >
                  良好
                </button>
                <button
                  type="button"
                  onClick={() => setSleepQuality('average')}
                  data-ai-label="选择睡眠质量为一般"
                  data-ai-context="用户正在填写一条新的睡眠记录，质量选择会影响后续 AI 对恢复状态的解读。"
                  className={`flex-1 rounded-2xl py-2.5 text-xs font-bold ${sleepQuality === 'average' ? 'bg-primary text-on-primary' : 'border border-outline bg-surface text-on-surface'}`}
                >
                  一般
                </button>
                <button
                  type="button"
                  onClick={() => setSleepQuality('poor')}
                  data-ai-label="选择睡眠质量为较差"
                  data-ai-context="用户正在填写一条新的睡眠记录，质量选择会影响后续 AI 对恢复状态的解读。"
                  className={`flex-1 rounded-2xl py-2.5 text-xs font-bold ${sleepQuality === 'poor' ? 'bg-primary text-on-primary' : 'border border-outline bg-surface text-on-surface'}`}
                >
                  较差
                </button>
              </div>
            </div>
            <button
              type="submit"
              data-ai-label="保存睡眠记录"
              data-ai-context="保存后，首页统计、目标入睡时间和后续提示都会使用这条最新睡眠数据。"
              className="w-full rounded-full bg-primary py-3.5 font-bold text-on-primary transition-colors hover:bg-primary/90"
            >
              保存记录
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="paper-panel-soft rounded-[32px] p-6">
            <p className="editorial-kicker">Quick Actions</p>
            <h3 className="mt-3 text-2xl font-headline font-semibold text-on-surface">现在就开始一段短睡</h3>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              睡眠模式和原来的倒计时逻辑完全一致，这里只把入口放进更明确的行动面板。
            </p>
            <button
              type="button"
              onClick={() => setShowSleepMode(true)}
              data-ai-label="开始一段小睡"
              data-ai-context="用户准备进入睡眠模式，AI 需要围绕补觉时长和恢复节奏给出解释。"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-lg font-bold text-on-primary shadow-[0_18px_40px_rgba(196,110,67,0.2)] transition-all hover:scale-[1.01] active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
              开始小睡
            </button>
          </div>

          <div className="paper-panel-soft rounded-[32px] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-secondary-container">
                <span className="material-symbols-outlined text-3xl text-secondary">self_improvement</span>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-headline font-semibold text-on-surface">睡前减压指南</h4>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">通过 10 分钟的呼吸练习，可以将深度睡眠比例提升 15%。</p>
                <button
                  type="button"
                  onClick={() => setShowRelaxGuideModal(true)}
                  data-ai-label="查看睡前减压指南"
                  data-ai-context="用户想在睡前放松，AI 应围绕呼吸练习和睡前准备给出即时说明。"
                  className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  查看详情 <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="paper-panel-soft rounded-[32px] p-6">
            <p className="editorial-kicker">Community</p>
            <h3 className="mt-3 text-2xl font-headline font-semibold text-on-surface">把新合并进来的社区能力也用起来</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => navigate('/social')}
                data-ai-label="打开睡友社区"
                data-ai-context="用户准备查看附近睡友、好友申请和聊天入口。"
                className="flex items-center justify-between rounded-[24px] border border-outline-variant bg-white/68 px-4 py-4 text-left transition hover:bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-on-surface">睡友社区</p>
                  <p className="mt-1 text-xs text-on-surface-variant">附近睡友、好友申请、聊天</p>
                </div>
                <span className="material-symbols-outlined text-primary">group</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/messageboard')}
                data-ai-label="打开社区留言板"
                data-ai-context="用户准备查看或发布社区留言，与其他使用者互动。"
                className="flex items-center justify-between rounded-[24px] border border-outline-variant bg-white/68 px-4 py-4 text-left transition hover:bg-white"
              >
                <div>
                  <p className="text-sm font-semibold text-on-surface">社区留言板</p>
                  <p className="mt-1 text-xs text-on-surface-variant">打卡、心得、吐槽、匿名倾诉</p>
                </div>
                <span className="material-symbols-outlined text-primary">forum</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSleepMode && <SleepMode onClose={() => setShowSleepMode(false)} />}

      {showTargetTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] p-6 backdrop-blur-sm">
          <div className="paper-panel w-full max-w-md rounded-[32px] p-8">
            <h2 className="mb-6 text-center text-2xl font-bold text-on-surface">设置目标时间</h2>

            <div className="mb-8">
              <label className="mb-2 block text-sm font-bold text-on-surface-variant">选择入睡时间</label>
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full rounded-2xl border border-outline bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setCustomTargetTime(targetTime);
                  setShowTargetTimeModal(false);
                }}
                data-ai-label="保存目标入睡时间"
                data-ai-context="用户正在覆盖系统计算的入睡目标，后续首页和按钮反馈都要参考这个时间。"
                className="w-full rounded-2xl bg-primary py-4 font-bold text-on-primary transition-colors hover:bg-primary/90"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setShowTargetTimeModal(false)}
                data-ai-label="取消编辑目标时间"
                data-ai-context="用户暂时放弃修改目标入睡时间。"
                className="w-full rounded-2xl bg-surface-container-low py-4 font-bold text-on-surface transition-colors hover:bg-surface-container"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomTargetTime(null);
                  // Bug 10 Fix: 恢复默认后立即重新计算最新目标，而非使用旧闭包值
                  setTargetTime(getTodayTarget());
                  setShowTargetTimeModal(false);
                }}
                data-ai-label="恢复默认目标时间"
                data-ai-context="用户想放弃自定义入睡时间，重新采用系统基于欠眠计算的目标。"
                className="w-full rounded-2xl bg-error-container py-4 font-bold text-error transition-colors hover:bg-error-container/90"
              >
                恢复默认
              </button>
            </div>
          </div>
        </div>
      )}

      {showRelaxGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] p-6 backdrop-blur-sm">
          <div className="paper-panel w-full max-w-md rounded-[32px] p-8">
            <h2 className="mb-6 text-center text-2xl font-bold text-on-surface">睡前减压指南</h2>

            <div className="mb-8 space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-bold text-on-surface">呼吸练习</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  1. 找一个舒适的坐姿或躺姿，放松全身肌肉
                  <br />2. 慢慢吸气，数到4
                  <br />3. 屏住呼吸，数到4
                  <br />4. 慢慢呼气，数到6
                  <br />5. 重复这个过程10分钟
                </p>
                <p className="mt-2 text-sm text-secondary">
                  效果：通过 10 分钟的呼吸练习，可以将深度睡眠比例提升 15%，减轻压力和焦虑。
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-bold text-on-surface">环境调整</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  1. 保持卧室温度在 18-20°C 之间
                  <br />2. 确保卧室安静、黑暗
                  <br />3. 使用舒适的床上用品
                  <br />4. 睡前避免使用电子设备
                </p>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-bold text-on-surface">睡前习惯</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  1. 睡前 1 小时避免饮用咖啡因
                  <br />2. 睡前 2-3 小时避免大餐
                  <br />3. 睡前可以阅读或听轻柔的音乐
                  <br />4. 建立固定的睡前仪式
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRelaxGuideModal(false)}
              data-ai-label="关闭睡前减压指南"
              data-ai-context="用户已经看完减压建议，准备回到当前页面继续操作。"
              className="w-full rounded-2xl bg-primary py-4 font-bold text-on-primary transition-colors hover:bg-primary/90"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="paper-panel rounded-[32px] p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="editorial-kicker mb-1">Weekly Trend</p>
              <h3 className="text-2xl font-headline font-semibold text-on-surface">最近 7 天睡眠情况</h3>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getLast7DaysData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
                <XAxis dataKey="date" stroke="var(--color-on-surface-variant)" />
                <YAxis stroke="var(--color-on-surface-variant)" domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="paper-panel-soft relative rounded-[28px] p-6">
            <span className="material-symbols-outlined mb-4 text-secondary">history</span>
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-bold text-on-surface-variant">累计偿还</p>
              <button
                type="button"
                data-ai-label="查看累计偿还说明"
                data-ai-context="用户想知道累计偿还睡眠时长在首页统计里的含义。"
                className="text-on-surface-variant transition-colors hover:text-primary"
                title="累计偿还的睡眠时长"
              >
                <span className="material-symbols-outlined text-xs">info</span>
              </button>
            </div>
            <h4 className="text-2xl font-bold text-on-surface">
              {getTotalRepayment().toFixed(1)} <span className="text-sm font-normal">h</span>
            </h4>
          </div>

          <div className="paper-panel-soft relative rounded-[28px] p-6">
            <span className="material-symbols-outlined mb-4 text-primary">calendar_today</span>
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-bold text-on-surface-variant">今日目标</p>
              <button
                type="button"
                data-ai-label="查看今日目标说明"
                data-ai-context="用户想知道今日目标入睡时间是如何根据当前作息推导出来的。"
                className="text-on-surface-variant transition-colors hover:text-primary"
                title="建议的入睡时间"
              >
                <span className="material-symbols-outlined text-xs">info</span>
              </button>
              <button
                type="button"
                onClick={handleOpenTargetModal}
                data-ai-label="编辑目标入睡时间"
                data-ai-context="用户准备手动调整今日目标入睡时间。"
                className="text-on-surface-variant transition-colors hover:text-primary"
                title="编辑目标时间"
              >
                <span className="material-symbols-outlined text-xs">edit</span>
              </button>
            </div>
            <h4 className="text-2xl font-bold text-on-surface">{getTodayTarget()}</h4>
          </div>
        </div>
      </div>
    </div>
  );
}
