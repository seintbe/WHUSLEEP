/**
 * social.ts
 * 好友关系 + 私信功能 API
 */
import { supabase, getOrCreateLocalUser, isSupabaseConfigured } from './supabase';
import type { DbFriendship, DbMessage, DbUser } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
// 好友关系
// ──────────────────────────────────────────────

export interface FriendInfo {
  userId: string;
  nickname: string;
  avatarSeed: string;
  status: 'pending' | 'accepted' | 'blocked';
  isSentByMe: boolean;
}

/** 发送好友申请 */
export async function sendFriendRequest(toUserId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const local = getOrCreateLocalUser();
  await supabase.from('friendships').insert({
    requester_id: local.id,
    addressee_id: toUserId,
    status: 'pending',
  });
}

/** 接受好友申请 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
}

/** 拒绝 / 删除好友关系 */
export async function removeFriendship(friendshipId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

/** 获取我的好友列表（已接受） */
export async function fetchFriends(): Promise<FriendInfo[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const local = getOrCreateLocalUser();

  const { data: rows } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${local.id},addressee_id.eq.${local.id}`)
    .eq('status', 'accepted');

  if (!rows || rows.length === 0) return [];
  return enrichFriendships(rows as DbFriendship[], local.id);
}

/** 获取待处理的好友申请（别人发给我的） */
export async function fetchPendingRequests(): Promise<(FriendInfo & { friendshipId: string })[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const local = getOrCreateLocalUser();

  const { data: rows } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .eq('addressee_id', local.id)
    .eq('status', 'pending');

  if (!rows || rows.length === 0) return [];
  const friends = await enrichFriendships(rows as DbFriendship[], local.id);
  return friends.map((f, i) => ({ ...f, friendshipId: (rows as DbFriendship[])[i].id }));
}

/** 检查与某用户的好友关系 */
export async function checkFriendship(
  otherUserId: string
): Promise<{ status: 'none' | 'pending_sent' | 'pending_received' | 'accepted'; friendshipId?: string }> {
  if (!isSupabaseConfigured) {
    return { status: 'none' };
  }
  const local = getOrCreateLocalUser();

  const { data } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(
      `and(requester_id.eq.${local.id},addressee_id.eq.${otherUserId}),` +
      `and(requester_id.eq.${otherUserId},addressee_id.eq.${local.id})`
    )
    .maybeSingle();

  if (!data) return { status: 'none' };
  if (data.status === 'accepted') return { status: 'accepted', friendshipId: data.id };
  if (data.requester_id === local.id) return { status: 'pending_sent', friendshipId: data.id };
  return { status: 'pending_received', friendshipId: data.id };
}

// 内部：批量查询用户信息并组装
async function enrichFriendships(rows: DbFriendship[], myId: string): Promise<FriendInfo[]> {
  const otherIds = rows.map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
  const { data: users } = await supabase
    .from('users')
    .select('id, nickname, avatar_seed')
    .in('id', otherIds);

  const userMap = new Map((users ?? []).map((u: DbUser) => [u.id, u]));

  return rows.map((r) => {
    const otherId = r.requester_id === myId ? r.addressee_id : r.requester_id;
    const u = userMap.get(otherId);
    return {
      userId: otherId,
      nickname: u?.nickname ?? '睡眠星球用户',
      avatarSeed: u?.avatar_seed ?? 'default',
      status: r.status,
      isSentByMe: r.requester_id === myId,
    };
  });
}

// ──────────────────────────────────────────────
// 消息
// ──────────────────────────────────────────────

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  isMine: boolean;
}

/** 获取与某用户的历史消息 */
export async function fetchMessages(otherUserId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) {
    return [];
  }
  const local = getOrCreateLocalUser();

  const { data } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, read_at, created_at')
    .or(
      `and(sender_id.eq.${local.id},receiver_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},receiver_id.eq.${local.id})`
    )
    .order('created_at', { ascending: true })
    .limit(100);

  return (data ?? []).map((m: DbMessage) => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    readAt: m.read_at,
    createdAt: m.created_at,
    isMine: m.sender_id === local.id,
  }));
}

/** 发送消息 */
export async function sendMessage(toUserId: string, content: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const local = getOrCreateLocalUser();
  await supabase.from('messages').insert({
    sender_id: local.id,
    receiver_id: toUserId,
    content: content.trim(),
  });
}

/** 标记消息为已读 */
export async function markMessagesRead(fromUserId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }
  const local = getOrCreateLocalUser();
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', fromUserId)
    .eq('receiver_id', local.id)
    .is('read_at', null);
}

/** 订阅与某用户的实时新消息 */
export function subscribeToMessages(
  otherUserId: string,
  onNew: (msg: Message) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  const local = getOrCreateLocalUser();

  return supabase
    .channel(`chat-${[local.id, otherUserId].sort().join('-')}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${local.id}`,
      },
      (payload) => {
        const m = payload.new as DbMessage;
        if (m.sender_id !== otherUserId) return;
        onNew({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          content: m.content,
          readAt: m.read_at,
          createdAt: m.created_at,
          isMine: false,
        });
      }
    )
    .subscribe();
}

/** 获取未读消息数（用于 badge） */
export async function fetchUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }
  const local = getOrCreateLocalUser();
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', local.id)
    .is('read_at', null);
  return count ?? 0;
}
