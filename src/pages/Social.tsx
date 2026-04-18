import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { fetchNearbyUsers, type NearbyUser } from '@/lib/presence';
import {
  fetchFriends,
  fetchPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  checkFriendship,
  type FriendInfo,
} from '@/lib/social';
import { getOrCreateLocalUser, isSupabaseConfigured, updateLocalUser } from '@/lib/supabase';

// ──────────────────────────────────────────────
// 头像生成（基于 seed 的 SVG 占位）
// ──────────────────────────────────────────────
function Avatar({ seed, size = 40 }: { seed: string; size?: number }) {
  const colors = ['#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316'];
  const idx = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const color = colors[idx];
  const initials = seed.slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-background shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

// ──────────────────────────────────────────────
// Tab 类型
// ──────────────────────────────────────────────
type TabType = 'nearby' | 'friends' | 'requests';

// ──────────────────────────────────────────────
// 附近睡友卡片
// ──────────────────────────────────────────────
function NearbyCard({ user, onAdd }: { key?: React.Key; user: NearbyUser; onAdd: (id: string) => void }) {
  const [friendStatus, setFriendStatus] = useState<
    'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'loading'
  >('loading');
  const [friendshipId, setFriendshipId] = useState<string | undefined>();

  useEffect(() => {
    checkFriendship(user.userId).then(({ status, friendshipId: fid }) => {
      setFriendStatus(status);
      setFriendshipId(fid);
    });
  }, [user.userId]);

  const handleAdd = async () => {
    setFriendStatus('pending_sent');
    await sendFriendRequest(user.userId);
    onAdd(user.userId);
  };

  const debtLabel =
    user.sleepDebtKey === 0
      ? '已还清'
      : `补觉 ${user.sleepDebtKey}h`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 flex items-center gap-3"
    >
      <Avatar seed={user.avatarSeed} size={44} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-sm truncate">{user.nickname}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-primary font-medium">{debtLabel}</span>
          <span className="text-on-surface-variant text-xs">·</span>
          <span className="text-xs text-on-surface-variant">{user.distanceMeters}m外</span>
        </div>
      </div>

      {friendStatus === 'loading' && (
        <div className="w-8 h-8 rounded-full bg-surface-container-highest animate-pulse" />
      )}
      {friendStatus === 'none' && (
        <button
          onClick={handleAdd}
          className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">person_add</span>
        </button>
      )}
      {friendStatus === 'pending_sent' && (
        <span className="text-[10px] text-on-surface-variant font-medium px-2 py-1 bg-surface-container rounded-full">
          已申请
        </span>
      )}
      {friendStatus === 'accepted' && (
        <button
          onClick={() => {}} // navigate to chat handled by parent
          className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-secondary text-[18px]">chat_bubble</span>
        </button>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// 好友卡片
// ──────────────────────────────────────────────
function FriendCard({
  friend,
  onChat,
  onRemove,
}: {
  key?: React.Key;
  friend: FriendInfo;
  onChat: (id: string, name: string, seed: string) => void;
  onRemove: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 flex items-center gap-3"
    >
      <Avatar seed={friend.avatarSeed} size={44} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-sm truncate">{friend.nickname}</p>
        <p className="text-xs text-secondary font-medium mt-0.5">睡友</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChat(friend.userId, friend.nickname, friend.avatarSeed)}
          className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            chat_bubble
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">more_vert</span>
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                className="absolute right-0 top-11 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg z-10 overflow-hidden"
              >
                <button
                  onClick={() => {
                    onRemove(friend.userId);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-error text-sm hover:bg-error-container transition-colors whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]">person_remove</span>
                  删除睡友
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// 好友申请卡片
// ──────────────────────────────────────────────
function RequestCard({
  request,
  onAccept,
  onDecline,
}: {
  key?: React.Key;
  request: FriendInfo & { friendshipId: string };
  onAccept: (fid: string) => void;
  onDecline: (fid: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 flex items-center gap-3"
    >
      <Avatar seed={request.avatarSeed} size={44} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-sm truncate">{request.nickname}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">想和你成为睡友</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onDecline(request.friendshipId)}
          className="w-9 h-9 rounded-full bg-error-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-error text-[18px]">close</span>
        </button>
        <button
          onClick={() => onAccept(request.friendshipId)}
          className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
        </button>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// 昵称编辑 Modal
// ──────────────────────────────────────────────
function NicknameModal({ current, onSave, onClose }: { current: string; onSave: (v: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-surface-container-low rounded-3xl p-6 w-full max-w-md border border-outline-variant"
      >
        <h3 className="text-lg font-bold text-on-surface mb-4">修改昵称</h3>
        <input
          className="w-full bg-surface rounded-xl border border-outline p-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary mb-4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={20}
          placeholder="输入你的睡友昵称"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface-variant font-bold"
          >
            取消
          </button>
          <button
            onClick={() => { if (value.trim()) onSave(value.trim()); }}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold"
          >
            保存
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────
// 主页面
// ──────────────────────────────────────────────
export default function Social() {
  const navigate = useNavigate();
  const { sleepDebt } = useAppStore();
  const [tab, setTab] = useState<TabType>('nearby');

  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [requests, setRequests] = useState<(FriendInfo & { friendshipId: string })[]>([]);

  const [loading, setLoading] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const localUser = getOrCreateLocalUser();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState(localUser.nickname);

  // 获取位置
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => setLocationDenied(true),
      { timeout: 8000 }
    );
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'nearby' && userLat !== null && userLng !== null) {
        const data = await fetchNearbyUsers(userLat, userLng, 1000);
        setNearby(data);
      } else if (tab === 'friends') {
        const data = await fetchFriends();
        setFriends(data);
      } else if (tab === 'requests') {
        const data = await fetchPendingRequests();
        setRequests(data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, userLat, userLng]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (fid: string) => {
    await acceptFriendRequest(fid);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== fid));
  };

  const handleDecline = async (fid: string) => {
    await removeFriendship(fid);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== fid));
  };

  const handleRemoveFriend = async (userId: string) => {
    const friend = friends.find((f) => f.userId === userId);
    if (!friend) return;
    const { friendshipId } = await checkFriendship(userId);
    if (friendshipId) await removeFriendship(friendshipId);
    setFriends((prev) => prev.filter((f) => f.userId !== userId));
  };

  const handleSaveNickname = (val: string) => {
    updateLocalUser({ nickname: val });
    setNickname(val);
    setShowNicknameModal(false);
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'nearby', icon: 'location_on', label: '附近' },
    { key: 'friends', icon: 'group', label: '睡友' },
    { key: 'requests', icon: 'person_add', label: '申请' },
  ];

  return (
    <div className="px-5 max-w-2xl mx-auto">
      {/* 个人身份栏 */}
      <div className="flex items-center gap-3 mb-5 mt-1">
        <Avatar seed={localUser.avatar_seed} size={48} />
        <div className="flex-1">
          <button
            onClick={() => setShowNicknameModal(true)}
            className="flex items-center gap-1 group"
          >
            <span className="font-bold text-on-surface text-base">{nickname}</span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary transition-colors">
              edit
            </span>
          </button>
          <p className="text-xs text-on-surface-variant">
            今日补觉 {sleepDebt === 0 ? '已还清 🎉' : `${sleepDebt}h`}
          </p>
        </div>
        <button
          onClick={loadData}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">refresh</span>
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-5 rounded-2xl border border-outline-variant bg-tertiary-container/70 p-4 text-sm text-on-surface-variant">
          社交模块已经合并进来了，但当前还没配置 Supabase，所以这里只会显示本地空态。把 `.env.local` 里的 Supabase 参数补齐后，就能启用附近睡友、好友申请和聊天。
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-5 bg-surface-container-low rounded-2xl p-1 border border-outline-variant">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: tab === t.key ? "'FILL' 1" : "'FILL' 0" }}
            >
              {t.icon}
            </span>
            {t.label}
            {t.key === 'requests' && requests.length > 0 && (
              <span className="bg-error text-on-error text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-surface-container-highest" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface-container-highest rounded w-2/3" />
                <div className="h-2.5 bg-surface-container-highest rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* 附近睡友 */}
          {tab === 'nearby' && (
            <motion.div
              key="nearby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {locationDenied && (
                <div className="bg-tertiary-container border border-outline-variant rounded-2xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                    info
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    开启位置权限后，才能发现百米内的睡友。请在浏览器设置中允许位置访问。
                  </p>
                </div>
              )}
              {nearby.length === 0 && !locationDenied ? (
                <div className="flex flex-col items-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-30">
                    person_search
                  </span>
                  <p className="text-sm">附近暂无在线睡友</p>
                  <p className="text-xs mt-1 opacity-60">半径 1km 内没有其他在线用户</p>
                </div>
              ) : (
                nearby.map((u) => (
                  <NearbyCard
                    key={u.userId}
                    user={u}
                    onAdd={() => {}}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* 我的睡友 */}
          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {friends.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-30">
                    group
                  </span>
                  <p className="text-sm">还没有睡友</p>
                  <p className="text-xs mt-1 opacity-60">去"附近"找找有缘的睡眠星球居民</p>
                </div>
              ) : (
                friends.map((f) => (
                  <FriendCard
                    key={f.userId}
                    friend={f}
                    onChat={(id, name, seed) =>
                      navigate(`/chat/${id}`, { state: { nickname: name, avatarSeed: seed } })
                    }
                    onRemove={handleRemoveFriend}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* 好友申请 */}
          {tab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <AnimatePresence>
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-5xl mb-3 opacity-30">
                      mark_email_unread
                    </span>
                    <p className="text-sm">暂无新申请</p>
                  </div>
                ) : (
                  requests.map((r) => (
                    <RequestCard
                      key={r.friendshipId}
                      request={r}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 昵称编辑弹窗 */}
      <AnimatePresence>
        {showNicknameModal && (
          <NicknameModal
            current={nickname}
            onSave={handleSaveNickname}
            onClose={() => setShowNicknameModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
