import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AiAssistantDock } from '@/components/AiAssistantDock';
import { requestAiButtonInsight, type AiButtonInsight } from '@/lib/aiButtonAssistant';
import { getDiningPoiById, normalizeDiningPoiId } from '@/lib/campusData';
import { useAppStore } from '@/store';

interface PendingButtonAction {
  actionId?: string;
  actionLabel: string;
  actionContext?: string;
}

interface AiButtonAssistantProviderProps {
  children: ReactNode;
}

const BUTTON_AI_DEBOUNCE_MS = 260;

export function AiButtonAssistantProvider({ children }: AiButtonAssistantProviderProps) {
  const location = useLocation();
  const {
    sleepDebt,
    transportMode,
    diningPOI,
    customDiningPois,
    courseSchedule,
    sleepData,
    customTargetTime,
  } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastActionLabel, setLastActionLabel] = useState('');
  const [insight, setInsight] = useState<AiButtonInsight | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);

  const diningName = useMemo(() => {
    return getDiningPoiById(normalizeDiningPoiId(diningPOI, customDiningPois), customDiningPois).name;
  }, [customDiningPois, diningPOI]);

  const appFacts = useMemo(() => {
    const facts = [
      `当前欠眠 ${sleepDebt.toFixed(1)} 小时`,
      `交通偏好：${translateTransportMode(transportMode)}`,
      `偏好食堂：${diningName}`,
      `已导入课程 ${courseSchedule.length} 节`,
      `今日目标入睡时间：${customTargetTime ?? '跟随系统动态计算'}`,
    ];

    const lastSleepRecord = sleepData[sleepData.length - 1];
    if (lastSleepRecord) {
      facts.push(
        `最近一条睡眠记录：${lastSleepRecord.hours} 小时，质量${translateSleepQuality(lastSleepRecord.quality)}`,
      );
    }

    return facts;
  }, [courseSchedule.length, customTargetTime, diningName, sleepData, sleepDebt, transportMode]);

  const latestSnapshotRef = useRef({
    pagePath: location.pathname,
    pageTitle: getPageTitle(location.pathname),
    appFacts,
  });

  latestSnapshotRef.current = {
    pagePath: location.pathname,
    pageTitle: getPageTitle(location.pathname),
    appFacts,
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const clickable = target.closest<HTMLElement>('button, [data-ai-action]');
      if (!clickable) {
        return;
      }

      if (clickable.dataset.aiSkip === 'true' || clickable.closest('[data-ai-panel-root="true"]')) {
        return;
      }

      if (clickable instanceof HTMLButtonElement && clickable.disabled) {
        return;
      }

      const actionLabel = extractActionLabel(clickable);
      if (!actionLabel) {
        return;
      }

      const pending: PendingButtonAction = {
        actionId: clickable.dataset.aiAction,
        actionLabel,
        actionContext: clickable.dataset.aiContext,
      };

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        void launchInsight(pending);
      }, BUTTON_AI_DEBOUNCE_MS);
    };

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      requestAbortRef.current?.abort();
    };
  }, []);

  async function launchInsight(action: PendingButtonAction) {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;

    const snapshot = latestSnapshotRef.current;
    setOpen(true);
    setLoading(true);
    setLastActionLabel(action.actionLabel);

    const nextInsight = await requestAiButtonInsight(
      {
        ...action,
        pagePath: snapshot.pagePath,
        pageTitle: snapshot.pageTitle,
        appFacts: snapshot.appFacts,
      },
      controller.signal,
    );

    if (controller.signal.aborted) {
      return;
    }

    setInsight(nextInsight);
    setLoading(false);
  }

  return (
    <>
      {children}
      <AiAssistantDock
        open={open}
        loading={loading}
        lastActionLabel={lastActionLabel}
        pageTitle={latestSnapshotRef.current.pageTitle}
        insight={insight}
        onToggle={() => setOpen((current) => !current)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function extractActionLabel(element: HTMLElement): string {
  const datasetLabel = element.dataset.aiLabel?.trim();
  if (datasetLabel) {
    return datasetLabel;
  }

  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) {
    return ariaLabel;
  }

  const title = element.getAttribute('title')?.trim();
  if (title) {
    return title;
  }

  const text = extractTextWithoutIconLigatures(element);
  return text.replace(/\s+/g, ' ').trim();
}

function extractTextWithoutIconLigatures(element: HTMLElement): string {
  const pieces: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        pieces.push(text);
      }
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.classList.contains('material-symbols-outlined') || node.tagName === 'SVG') {
      return;
    }

    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(element.childNodes).forEach(walk);
  return pieces.join(' ');
}

function getPageTitle(pathname: string): string {
  switch (pathname) {
    case '/':
      return '睡眠';
    case '/timeline':
      return '记录';
    case '/map':
      return '发现';
    case '/profile':
      return '我的';
    case '/onboarding':
      return '引导';
    default:
      return '睡了么';
  }
}

function translateTransportMode(mode: string): string {
  if (mode === 'walking') {
    return '步行';
  }

  if (mode === 'ebike') {
    return '电动车';
  }

  if (mode === 'bus') {
    return '校巴';
  }

  return mode || '未设置';
}

function translateSleepQuality(quality: 'good' | 'average' | 'poor'): string {
  if (quality === 'good') {
    return '良好';
  }

  if (quality === 'poor') {
    return '较差';
  }

  return '一般';
}
