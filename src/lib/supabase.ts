import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
// 环境变量（在 .env.local 中配置）
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
// ──────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const fallbackSupabaseUrl = 'https://example.supabase.co';
const fallbackSupabaseAnonKey = 'public-anon-key-placeholder';

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key');

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackSupabaseAnonKey,
  {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  },
);

// ──────────────────────────────────────────────
// 数据库类型定义（对应 Supabase 表结构）
// ──────────────────────────────────────────────
export interface DbUser {
  id: string;
  nickname: string;
  avatar_seed: string; // 用于生成 dicebear 头像
  campus: string;
  created_at: string;
}

export interface DbPresence {
  user_id: string;
  is_online: boolean;
  lat: number | null;
  lng: number | null;
  /** 补觉需求，精度 0.5h：Math.round(sleepDebt * 2) / 2 */
  sleep_debt_key: number;
  updated_at: string;
}

export interface DbFriendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface DbMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// 匿名用户管理（首次打开时自动创建匿名账号）
// ──────────────────────────────────────────────
const LOCAL_USER_KEY = 'whusleep_local_user';

export interface LocalUser {
  id: string;
  nickname: string;
  avatar_seed: string;
}

export function getOrCreateLocalUser(): LocalUser {
  const saved = localStorage.getItem(LOCAL_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as LocalUser;
    } catch {
      // ignore
    }
  }

  const newUser: LocalUser = {
    id: crypto.randomUUID(),
    nickname: `睡眠星球#${Math.floor(Math.random() * 9000) + 1000}`,
    avatar_seed: Math.random().toString(36).slice(2, 10),
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export function updateLocalUser(updates: Partial<Pick<LocalUser, 'nickname' | 'avatar_seed'>>) {
  const current = getOrCreateLocalUser();
  const updated = { ...current, ...updates };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  return updated;
}
