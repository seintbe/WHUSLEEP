import type { AiButtonInsight } from '@/lib/aiButtonAssistant';

interface AiAssistantDockProps {
  open: boolean;
  loading: boolean;
  lastActionLabel: string;
  pageTitle: string;
  insight: AiButtonInsight | null;
  onToggle: () => void;
  onClose: () => void;
}

export function AiAssistantDock({
  open,
  loading,
  lastActionLabel,
  pageTitle,
  insight,
  onToggle,
  onClose,
}: AiAssistantDockProps) {
  const toneClasses = getToneClasses(insight?.tone);
  const sourceLabel = insight?.source === 'model' ? '在线生成' : '本地说明';

  return (
    <div data-ai-panel-root="true" className="fixed inset-x-4 bottom-24 z-[60] sm:inset-x-auto sm:right-6 sm:w-[360px]">
      {open ? (
        <div className="paper-panel glass-panel mb-3 overflow-hidden rounded-[28px] border border-outline-variant shadow-[0_24px_60px_rgba(36,29,25,0.18)]">
          <div className="border-b border-outline-variant px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="editorial-kicker">Action Notes</p>
                <h3 className="mt-2 font-headline text-xl font-semibold text-on-surface">
                  {loading ? '正在整理这次操作' : insight?.title ?? '操作提示'}
                </h3>
              </div>
              <button
                type="button"
                data-ai-skip="true"
                onClick={onClose}
                className="rounded-full bg-surface-container-low p-2 text-on-surface-variant transition-colors hover:text-on-surface"
                aria-label="关闭操作提示"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant">
              当前页面：{pageTitle}
              {lastActionLabel ? ` · 刚触发「${lastActionLabel}」` : ''}
            </p>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <p className="text-sm text-on-surface-variant">正在结合当前页面和你的状态生成提示...</p>
                </div>
                <p className="text-xs leading-6 text-on-surface-variant">
                  如果当前服务暂时不可用，会自动切回本地说明，不影响正常点击。
                </p>
              </div>
            ) : insight ? (
              <div className="space-y-4">
                <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
                  <p className="text-sm leading-7">{insight.summary}</p>
                </div>
                {insight.suggestions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {insight.suggestions.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-outline-variant bg-white/72 px-3 py-1 text-xs text-on-surface-variant"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>输出来源：{sourceLabel}</span>
                  <button
                    type="button"
                    data-ai-skip="true"
                    onClick={onToggle}
                    className="font-semibold text-primary"
                  >
                    收起
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-on-surface-variant">
                点任意一个按钮，这里会结合页面和当前状态给出一条说明。
              </p>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        data-ai-skip="true"
        onClick={onToggle}
        className="ml-auto flex h-12 items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 text-sm font-semibold text-on-primary shadow-[0_18px_38px_rgba(196,110,67,0.24)]"
      >
        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        <span>{open ? '提示面板已展开' : '查看操作提示'}</span>
      </button>
    </div>
  );
}

function getToneClasses(tone: AiButtonInsight['tone'] | undefined): string {
  if (tone === 'active') {
    return 'border-primary/25 bg-primary-container text-on-primary-container';
  }

  if (tone === 'caution') {
    return 'border-tertiary/25 bg-tertiary-container text-on-tertiary-container';
  }

  return 'border-secondary/25 bg-secondary-container text-on-secondary-container';
}
