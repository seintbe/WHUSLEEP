/**
 * presence.ts
 * 管理用户在线状态上报、在线人数订阅、相同补觉人数、100m内人数查询
 */
import { supabase, getOrCreateLocalUser, isSupabaseConfigured } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// GCJ-02 → WGS-84 坐标转换（高德 → PostGIS）
// 误差 < 1m，适用于武汉大学校园范围
function gcj02ToWgs84(lat: number, lng: number): { lat: number; lng: number } {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  function transformLat(x: number, y: number): number {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  const dlat = transformLat(lng - 105.0, lat - 35.0);
  const dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * Math.PI;
  const magic = Math.sin(radlat);
  const sqrtmagic = Math.sqrt(1 - ee * magic * magic);

  return {
    lat: lat - (dlat * 180.0) / ((a * (1 - ee)) / (sqrtmagic * sqrtmagic * sqrtmagic) * Math.PI),
    lng: lng - (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * Math.PI),
  };
}

// ──────────────────────────────────────────────
// 确保用户记录存在（upsert）
// ──────────────────────────────────────────────
async function ensureUserExists(): Promise<string> {
  const local = getOrCreateLocalUser();
  if (!isSupabaseConfigured) {
    return local.id;
  }
  await supabase.from('users').upsert(
    { id: local.id, nickname: local.nickname, avatar_seed: local.avatar_seed, campus: 'WHU' },
    { onConflict: 'id', ignoreDuplicates: false }
  );
  return local.id;
}

// ──────────────────────────────────────────────
// 上报在线状态（含位置和补觉欠债）
// ──────────────────────────────────────────────
export async function reportPresence(sleepDebt: number): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const userId = await ensureUserExists();
  const debtKey = Math.round(sleepDebt * 2) / 2; // 精度 0.5h

  let lat: number | null = null;
  let lng: number | null = null;

  // 尝试获取位置（用户可能拒绝）
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 60000,
      })
    );
    // 浏览器 Geolocation 返回 WGS-84，直接使用
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch {
    // 无位置权限时仍上报在线状态，只是无法参与百米查询
  }

  await supabase.from('user_presence').upsert(
    {
      user_id: userId,
      is_online: true,
      lat,
      lng,
      sleep_debt_key: debtKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

// ──────────────────────────────────────────────
// 离线上报
// ──────────────────────────────────────────────
export async function reportOffline(): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const local = getOrCreateLocalUser();
  await supabase
    .from('user_presence')
    .update({ is_online: false, updated_at: new Date().toISOString() })
    .eq('user_id', local.id);
}

// ──────────────────────────────────────────────
// 一次性查询：在线人数、同债人数、百米内人数
// ──────────────────────────────────────────────
export interface SocialStats {
  onlineCount: number;
  sameDebtCount: number;
  nearbyCount: number;
}

export async function fetchSocialStats(
  sleepDebt: number,
  userLat: number | null,
  userLng: number | null
): Promise<SocialStats> {
  if (!isSupabaseConfigured) {
    return { onlineCount: 0, sameDebtCount: 0, nearbyCount: 0 };
  }
  const debtKey = Math.round(sleepDebt * 2) / 2;

  // 在线总人数
  const { count: onlineCount } = await supabase
    .from('user_presence')
    .select('*', { count: 'exact', head: true })
    .eq('is_online', true);

  // 同债人数（同精度补觉需求）
  const local = getOrCreateLocalUser();
  const { count: sameDebtCount } = await supabase
    .from('user_presence')
    .select('*', { count: 'exact', head: true })
    .eq('is_online', true)
    .eq('sleep_debt_key', debtKey)
    .neq('user_id', local.id);

  // 百米内人数（Haversine 近似，精度足够）
  let nearbyCount = 0;
  if (userLat !== null && userLng !== null) {
    const { data: nearbyData } = await supabase
      .from('user_presence')
      .select('lat, lng')
      .eq('is_online', true)
      .neq('user_id', local.id)
      .not('lat', 'is', null)
      .not('lng', 'is', null);

    if (nearbyData) {
      nearbyCount = nearbyData.filter(({ lat, lng }) => {
        if (lat === null || lng === null) return false;
        return haversineDistance(userLat, userLng, lat, lng) <= 100;
      }).length;
    }
  }

  return {
    onlineCount: onlineCount ?? 0,
    sameDebtCount: sameDebtCount ?? 0,
    nearbyCount,
  };
}

// Haversine 距离（米）
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ──────────────────────────────────────────────
// 实时订阅：在线人数变化
// ──────────────────────────────────────────────
export function subscribeToOnlineCount(
  onUpdate: (count: number) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured) {
    onUpdate(0);
    return null;
  }
  const channel = supabase
    .channel('presence-online-count')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_presence' },
      async () => {
        const { count } = await supabase
          .from('user_presence')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true);
        onUpdate(count ?? 0);
      }
    )
    .subscribe();

  return channel;
}

// ──────────────────────────────────────────────
// 附近睡友列表（地图页用）
// ──────────────────────────────────────────────
export interface NearbyUser {
  userId: string;
  nickname: string;
  avatarSeed: string;
  sleepDebtKey: number;
  distanceMeters: number;
}

export async function fetchNearbyUsers(
  userLat: number,
  userLng: number,
  radiusMeters = 500
): Promise<NearbyUser[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const local = getOrCreateLocalUser();

  const { data: presenceData } = await supabase
    .from('user_presence')
    .select('user_id, lat, lng, sleep_debt_key')
    .eq('is_online', true)
    .neq('user_id', local.id)
    .not('lat', 'is', null)
    .not('lng', 'is', null);

  if (!presenceData || presenceData.length === 0) return [];

  const nearby = presenceData
    .map((p) => ({
      ...p,
      dist: haversineDistance(userLat, userLng, p.lat!, p.lng!),
    }))
    .filter((p) => p.dist <= radiusMeters)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 20);

  if (nearby.length === 0) return [];

  const userIds = nearby.map((p) => p.user_id);
  const { data: usersData } = await supabase
    .from('users')
    .select('id, nickname, avatar_seed')
    .in('id', userIds);

  const userMap = new Map((usersData ?? []).map((u) => [u.id, u]));

  return nearby.map((p) => {
    const u = userMap.get(p.user_id);
    return {
      userId: p.user_id,
      nickname: u?.nickname ?? '睡眠星球用户',
      avatarSeed: u?.avatar_seed ?? 'default',
      sleepDebtKey: p.sleep_debt_key,
      distanceMeters: Math.round(p.dist),
    };
  });
}

// ──────────────────────────────────────────────
// 心跳管理（App 挂载时启动，卸载时清理）
// ──────────────────────────────────────────────
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let cachedLat: number | null = null;
let cachedLng: number | null = null;
let sleepDebtGetter: (() => number) | null = null;
let visibilityHandler: (() => void) | null = null;
let beforeUnloadHandler: (() => void) | null = null;

export function startHeartbeat(getSleepDebt: () => number): void {
  sleepDebtGetter = getSleepDebt;
  if (!isSupabaseConfigured || heartbeatTimer) return;

  const tick = async () => {
    await reportPresence(sleepDebtGetter ? sleepDebtGetter() : 0);
  };

  // 立即上报一次
  tick();
  heartbeatTimer = setInterval(tick, 30_000); // 每 30 秒

  // 监听页面可见性
  visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      reportOffline();
    } else {
      tick();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);

  // 页面关闭时离线
  beforeUnloadHandler = () => {
    reportOffline();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }
}

export { gcj02ToWgs84, haversineDistance };
export { cachedLat, cachedLng };
