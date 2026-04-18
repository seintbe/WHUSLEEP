import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchSocialStats, subscribeToOnlineCount } from '@/lib/presence';
import type { SocialStats } from '@/lib/presence';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SocialStatsProps {
  sleepDebt: number;
}

export default function SocialStats({ sleepDebt }: SocialStatsProps) {
  const [stats, setStats] = useState<SocialStats>({
    onlineCount: 0,
    sameDebtCount: 0,
    nearbyCount: 0,
  });
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 获取位置
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {} // 无权限时静默失败
    );
  }, []);

  // 初始加载 + 位置/sleepDebt 变化时刷新
  useEffect(() => {
    setLoading(true);
    fetchSocialStats(sleepDebt, userLat, userLng)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [sleepDebt, userLat, userLng]);

  // 实时订阅在线人数
  useEffect(() => {
    channelRef.current = subscribeToOnlineCount((count) => {
      setStats((prev) => ({ ...prev, onlineCount: count }));
    });
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  const items = [
    {
      icon: 'group',
      value: stats.onlineCount,
      label: '同时在线',
      color: 'text-secondary',
      bgColor: 'bg-secondary-container',
      glowColor: 'rgba(16,185,129,0.15)',
    },
    {
      icon: 'bedtime',
      value: stats.sameDebtCount,
      label: `同补${Math.round(sleepDebt * 2) / 2}h`,
      color: 'text-tertiary',
      bgColor: 'bg-tertiary-container',
      glowColor: 'rgba(245,158,11,0.15)',
    },
    {
      icon: 'location_on',
      value: stats.nearbyCount,
      label: '百米睡友',
      color: 'text-primary',
      bgColor: 'bg-primary-container',
      glowColor: 'rgba(56,189,248,0.15)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full grid grid-cols-3 gap-3 mb-6"
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
          className="bg-surface-container-low rounded-2xl border border-outline-variant p-3 flex flex-col items-center gap-1.5"
          style={{ boxShadow: `0 4px 20px ${item.glowColor}` }}
        >
          <div className={`w-8 h-8 rounded-xl ${item.bgColor} flex items-center justify-center`}>
            <span
              className={`material-symbols-outlined text-[18px] ${item.color}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {item.icon}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                className="w-8 h-6 bg-surface-container-highest rounded animate-pulse"
              />
            ) : (
              <motion.span
                key={item.value}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
                className={`text-xl font-bold ${item.color} leading-none`}
              >
                {item.value}
              </motion.span>
            )}
          </AnimatePresence>

          <span className="text-[10px] text-on-surface-variant font-medium leading-tight text-center">
            {item.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}
