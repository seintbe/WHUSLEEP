import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store';

interface SleepModeProps {
  onClose: () => void;
}

export default function SleepMode({ onClose }: SleepModeProps) {
  const { isSleepModeActive, startSleepMode, stopSleepMode, getRemainingTime } = useAppStore();
  const [duration, setDuration] = useState(20);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showMode, setShowMode] = useState<'select' | 'active'>('select');

  useEffect(() => {
    if (isSleepModeActive) {
      const interval = setInterval(() => {
        setRemainingTime(getRemainingTime());
      }, 1000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [isSleepModeActive, getRemainingTime]);

  const handleStart = () => {
    startSleepMode(duration);
    // Bug 4 Fix: 立即同步设置剩余时间，避免 active 模式首屏显示 00:00。
    // setInterval 要等 1 秒才首次触发，若不在此处初始化则必然闪烁。
    setRemainingTime(duration * 60);
    setShowMode('active');
  };

  const handleStop = () => {
    stopSleepMode();
    setShowMode('select');
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showMode === 'select') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] p-6 backdrop-blur-sm">
        <div className="paper-panel w-full max-w-md rounded-[32px] p-8">
          <p className="editorial-kicker text-center">Nap Mode</p>
          <h2 className="mb-6 mt-3 text-center text-2xl font-bold text-on-surface">开始小睡</h2>

          <div className="mb-8">
            <label className="mb-2 block text-sm font-bold text-on-surface-variant">选择睡眠时长</label>
            <div className="grid grid-cols-3 gap-3">
              {[10, 20, 30, 45, 60, 90].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setDuration(time)}
                  data-ai-label={`选择 ${time} 分钟小睡`}
                  data-ai-context="用户正在设置一段小睡时长，AI 需要根据补觉节奏解释这次选择。"
                  className={`rounded-2xl py-3 text-sm font-bold ${duration === time ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface'}`}
                >
                  {time} 分钟
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleStart}
              data-ai-label="开始睡眠模式"
              data-ai-context="用户准备开始小睡倒计时，结束后系统会把这段休息写入睡眠记录。"
              className="w-full rounded-2xl bg-primary py-4 font-bold text-on-primary transition-colors hover:bg-primary/90"
            >
              开始睡眠
            </button>
            <button
              type="button"
              onClick={onClose}
              data-ai-label="取消睡眠模式"
              data-ai-context="用户暂时不进入小睡倒计时。"
              className="w-full rounded-2xl bg-surface-container-low py-4 font-bold text-on-surface transition-colors hover:bg-surface-container"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,29,25,0.18)] p-6 backdrop-blur-sm">
      <div className="paper-panel w-full max-w-md rounded-[32px] p-8">
        <p className="editorial-kicker text-center">Rest In Progress</p>
        <h2 className="mb-2 mt-3 text-center text-2xl font-bold text-on-surface">睡眠模式</h2>
        <p className="mb-8 text-center text-sm text-on-surface-variant">正在记录您的睡眠...</p>

        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 font-headline text-6xl font-semibold text-primary">
            {formatTime(remainingTime)}
          </div>
          <p className="text-sm text-on-surface-variant">剩余时间</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleStop}
            data-ai-label="结束睡眠模式"
            data-ai-context="用户准备结束本轮小睡，系统会结算这次休息并写回首页记录。"
            className="w-full rounded-2xl bg-primary py-4 font-bold text-on-primary transition-colors hover:bg-primary/90"
          >
            结束睡眠
          </button>
        </div>
      </div>
    </div>
  );
}
