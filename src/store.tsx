import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CourseScheduleItem } from '@/lib/courseSchedule';
import {
  DEFAULT_DINING_POI_ID,
  STORAGE_VERSION,
  normalizeCustomDiningPois,
  normalizeDiningPoiId,
  type CampusPoi,
} from '@/lib/campusData';

export interface SleepData {
  date: string;
  hours: number;
  quality: 'good' | 'average' | 'poor';
  notes?: string;
}

export type MessageCategory = 'checkin' | 'experience' | 'complaint' | 'anonymous';

export interface Reply {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  anonymous: boolean;
}

export interface Message {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  likes: number;
  likedBy: string[];
  category: MessageCategory;
  anonymous: boolean;
  replies: Reply[];
}

interface AppState {
  sleepDebt: number;
  transportMode: string;
  diningPOI: string;
  customDiningPois: CampusPoi[];
  scheduleImported: boolean;
  courseSchedule: CourseScheduleItem[];
  sleepData: SleepData[];
  isSleepModeActive: boolean;
  sleepModeEndTime: number | null;
  sleepModeDuration: number;
  customTargetTime: string | null;
  messages: Message[];
  currentUserId: string;
  getTotalRepayment: () => number;
  getTodayTarget: () => string;
  setTransportMode: (val: string) => void;
  setDiningPOI: (val: string) => void;
  addCustomDiningPoi: (poi: CampusPoi) => void;
  removeCustomDiningPoi: (poiId: string) => void;
  setCourseSchedule: (courses: CourseScheduleItem[]) => void;
  clearCourseSchedule: () => void;
  setCustomTargetTime: (time: string | null) => void;
  addSleepData: (data: Omit<SleepData, 'date'>) => void;
  updateSleepData: (date: string, data: Partial<Omit<SleepData, 'date'>>) => void;
  getSleepDataByDate: (date: string) => SleepData | undefined;
  startSleepMode: (duration: number) => void;
  stopSleepMode: () => void;
  getRemainingTime: () => number;
  addMessage: (data: { content: string; author: string; category: MessageCategory; anonymous: boolean }) => void;
  toggleLike: (messageId: string, userId: string) => void;
  deleteMessage: (messageId: string) => void;
  addReply: (messageId: string, data: { content: string; author: string; anonymous: boolean }) => void;
  toggleReplyLike: (messageId: string, replyId: string, userId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const RECOMMENDED_SLEEP_HOURS = 8;

const STORAGE_KEYS = [
  'transportMode',
  'diningPOI',
  'customDiningPois',
  'courseSchedule',
  'sleepData',
  'customTargetTime',
  'messages',
] as const;

initializeStorage();

export function AppProvider({ children }: { children: ReactNode }) {
  const [transportMode, setTransportMode] = useState(() => readStorageValue('transportMode', 'walking'));
  const [customDiningPois, setCustomDiningPois] = useState<CampusPoi[]>(() =>
    normalizeCustomDiningPois(readStorageValue<CampusPoi[]>('customDiningPois', [])),
  );
  const [diningPOI, setDiningPOIState] = useState(() =>
    normalizeDiningPoiId(readStorageValue('diningPOI', DEFAULT_DINING_POI_ID), customDiningPois),
  );
  const [courseSchedule, setCourseScheduleState] = useState<CourseScheduleItem[]>(() =>
    readStorageValue<CourseScheduleItem[]>('courseSchedule', []),
  );
  const [sleepData, setSleepData] = useState<SleepData[]>(() => readStorageValue<SleepData[]>('sleepData', []));
  const [isSleepModeActive, setIsSleepModeActive] = useState(false);
  const [sleepModeEndTime, setSleepModeEndTime] = useState<number | null>(null);
  const [sleepModeDuration, setSleepModeDuration] = useState(0);
  const [customTargetTime, setCustomTargetTimeState] = useState<string | null>(() =>
    readStorageValue<string | null>('customTargetTime', null),
  );
  const [messages, setMessages] = useState<Message[]>(() => readStorageValue<Message[]>('messages', []));
  const [currentUserId] = useState(() => {
    const savedId = localStorage.getItem('sleepUserId');
    if (savedId) {
      return savedId;
    }
    const newId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('sleepUserId', newId);
    return newId;
  });
  const scheduleImported = courseSchedule.length > 0;

  const sleepDebt = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySleep = sleepData.find((item) => item.date === today);
    if (!todaySleep) {
      return 0;
    }
    const debt = Math.max(0, RECOMMENDED_SLEEP_HOURS - todaySleep.hours);
    return parseFloat(debt.toFixed(1));
  }, [sleepData]);

  useEffect(() => {
    localStorage.setItem('sleepData', JSON.stringify(sleepData));
  }, [sleepData]);

  useEffect(() => {
    localStorage.setItem('transportMode', JSON.stringify(transportMode));
  }, [transportMode]);

  useEffect(() => {
    localStorage.setItem('diningPOI', JSON.stringify(diningPOI));
  }, [diningPOI]);

  useEffect(() => {
    localStorage.setItem('customDiningPois', JSON.stringify(customDiningPois));
  }, [customDiningPois]);

  useEffect(() => {
    localStorage.setItem('courseSchedule', JSON.stringify(courseSchedule));
  }, [courseSchedule]);

  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  const startSleepMode = (duration: number) => {
    setSleepModeDuration(duration);
    setSleepModeEndTime(Date.now() + duration * 60 * 1000);
    setIsSleepModeActive(true);
  };

  const stopSleepMode = () => {
    const duration = sleepModeDuration;
    setIsSleepModeActive(false);
    setSleepModeEndTime(null);
    setSleepModeDuration(0);

    if (duration > 0) {
      addSleepData({ hours: duration / 60, quality: 'good' });
    }
  };

  const getRemainingTime = () => {
    if (!isSleepModeActive || !sleepModeEndTime) {
      return 0;
    }
    const remaining = Math.max(0, sleepModeEndTime - Date.now());
    return Math.ceil(remaining / 1000);
  };

  const setCustomTargetTime = (time: string | null) => {
    setCustomTargetTimeState(time);
    localStorage.setItem('customTargetTime', JSON.stringify(time));
  };

  const setDiningPOI = (val: string) => {
    setDiningPOIState(normalizeDiningPoiId(val, customDiningPois));
  };

  const addCustomDiningPoi = (poi: CampusPoi) => {
    const normalizedPoi = normalizeCustomDiningPois([poi])[0];
    if (!normalizedPoi) {
      return;
    }

    setCustomDiningPois((current) => {
      const next = current.filter((item) => item.id !== normalizedPoi.id);
      return [...next, normalizedPoi];
    });
    setDiningPOIState(normalizedPoi.id);
  };

  const removeCustomDiningPoi = (poiId: string) => {
    setCustomDiningPois((current) => current.filter((poi) => poi.id !== poiId));
    setDiningPOIState((current) => (current === poiId ? DEFAULT_DINING_POI_ID : current));
  };

  const setCourseSchedule = (courses: CourseScheduleItem[]) => {
    setCourseScheduleState(courses);
  };

  const clearCourseSchedule = () => {
    setCourseScheduleState([]);
  };

  const addSleepData = (data: Omit<SleepData, 'date'>) => {
    const today = new Date().toISOString().split('T')[0];
    setSleepData((prev) => {
      const existingIndex = prev.findIndex((item) => item.date === today);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...data };
        return updated;
      }
      return [...prev, { ...data, date: today }];
    });
  };

  const updateSleepData = (date: string, data: Partial<Omit<SleepData, 'date'>>) => {
    setSleepData((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((item) => item.date === date);
      if (index >= 0) {
        updated[index] = { ...updated[index], ...data };
      }
      return updated;
    });
  };

  const getSleepDataByDate = (date: string) => sleepData.find((item) => item.date === date);

  const getTotalRepayment = () =>
    sleepData.reduce((total, item) => {
      const extraSleep = Math.max(0, item.hours - RECOMMENDED_SLEEP_HOURS);
      return total + extraSleep;
    }, 0);

  const getTodayTarget = () => {
    if (customTargetTime) {
      return customTargetTime;
    }

    const defaultWakeUpHour = 7;
    const requiredSleepHours = RECOMMENDED_SLEEP_HOURS + sleepDebt;
    let targetHour = defaultWakeUpHour - requiredSleepHours;

    if (targetHour < 0) {
      targetHour += 24;
    }

    const hour = Math.floor(targetHour);
    const minute = Math.round((targetHour - hour) * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const addMessage = (data: { content: string; author: string; category: MessageCategory; anonymous: boolean }) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      content: data.content,
      author: data.author,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      category: data.category,
      anonymous: data.anonymous,
      replies: [],
    };
    setMessages((prev) => [newMessage, ...prev]);
  };

  const toggleLike = (messageId: string, userId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) {
          return msg;
        }
        const hasLiked = msg.likedBy.includes(userId);
        return {
          ...msg,
          likes: hasLiked ? msg.likes - 1 : msg.likes + 1,
          likedBy: hasLiked ? msg.likedBy.filter((id) => id !== userId) : [...msg.likedBy, userId],
        };
      }),
    );
  };

  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const addReply = (messageId: string, data: { content: string; author: string; anonymous: boolean }) => {
    const newReply: Reply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      content: data.content,
      author: data.author,
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      anonymous: data.anonymous,
    };

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) {
          return msg;
        }
        return {
          ...msg,
          replies: [...msg.replies, newReply],
        };
      }),
    );
  };

  const toggleReplyLike = (messageId: string, replyId: string, userId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) {
          return msg;
        }
        return {
          ...msg,
          replies: msg.replies.map((reply) => {
            if (reply.id !== replyId) {
              return reply;
            }
            const hasLiked = reply.likedBy.includes(userId);
            return {
              ...reply,
              likes: hasLiked ? reply.likes - 1 : reply.likes + 1,
              likedBy: hasLiked ? reply.likedBy.filter((id) => id !== userId) : [...reply.likedBy, userId],
            };
          }),
        };
      }),
    );
  };

  return (
    <AppContext.Provider
      value={{
        sleepDebt,
        transportMode,
        diningPOI,
        customDiningPois,
        scheduleImported,
        courseSchedule,
        sleepData,
        isSleepModeActive,
        sleepModeEndTime,
        sleepModeDuration,
        customTargetTime,
        messages,
        currentUserId,
        getTotalRepayment,
        getTodayTarget,
        setTransportMode,
        setDiningPOI,
        addCustomDiningPoi,
        removeCustomDiningPoi,
        setCourseSchedule,
        clearCourseSchedule,
        setCustomTargetTime,
        addSleepData,
        updateSleepData,
        getSleepDataByDate,
        startSleepMode,
        stopSleepMode,
        getRemainingTime,
        addMessage,
        toggleLike,
        deleteMessage,
        addReply,
        toggleReplyLike,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}

function readStorageValue<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function initializeStorage() {
  const savedVersion = localStorage.getItem('appStorageVersion');
  if (savedVersion === STORAGE_VERSION) {
    return;
  }

  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem('appStorageVersion', STORAGE_VERSION);
}
