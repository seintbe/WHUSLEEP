import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  fetchMessages,
  sendMessage,
  markMessagesRead,
  subscribeToMessages,
  type Message,
} from '@/lib/social';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
// 头像（与 Social.tsx 保持一致）
// ──────────────────────────────────────────────
function Avatar({ seed, size = 36 }: { seed: string; size?: number }) {
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
// 单条消息气泡
// ──────────────────────────────────────────────
function Bubble({ msg }: { key?: React.Key; msg: Message }) {
  const time = new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div
        className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          msg.isMine
            ? 'bg-primary text-on-primary rounded-br-md'
            : 'bg-surface-container-high text-on-surface rounded-bl-md border border-outline-variant'
        }`}
      >
        {msg.content}
      </div>
      <span className="text-[10px] text-on-surface-variant mb-0.5 shrink-0">{time}</span>
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// 日期分隔线
// ──────────────────────────────────────────────
function DateDivider({ date }: { key?: React.Key; date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-outline-variant" />
      <span className="text-[10px] text-on-surface-variant font-medium">{date}</span>
      <div className="flex-1 h-px bg-outline-variant" />
    </div>
  );
}

// ──────────────────────────────────────────────
// 快捷回复预设
// ──────────────────────────────────────────────
const QUICK_REPLIES = ['一起补觉？', '今天睡够了吗', '你也还债中？', '晚安 💤'];

// ──────────────────────────────────────────────
// 主页面
// ──────────────────────────────────────────────
export default function Chat() {
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { nickname?: string; avatarSeed?: string } | null;

  const nickname = state?.nickname ?? '睡友';
  const avatarSeed = state?.avatarSeed ?? 'default';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 初始加载历史消息
  useEffect(() => {
    if (!otherUserId) return;
    setLoading(true);
    fetchMessages(otherUserId)
      .then((msgs) => {
        setMessages(msgs);
        markMessagesRead(otherUserId);
      })
      .finally(() => setLoading(false));
  }, [otherUserId]);

  // 实时订阅新消息
  useEffect(() => {
    if (!otherUserId) return;
    channelRef.current = subscribeToMessages(otherUserId, (msg) => {
      setMessages((prev) => [...prev, msg]);
      markMessagesRead(otherUserId);
    });
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [otherUserId]);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !otherUserId || sending) return;

    // 乐观更新
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      senderId: 'me',
      receiverId: otherUserId,
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
      isMine: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      await sendMessage(otherUserId, content);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  // 日期分组渲染
  const renderMessages = (): ReactNode => {
    const nodes: ReactNode[] = [];
    let lastDate = '';

    messages.forEach((msg) => {
      const d = new Date(msg.createdAt);
      const dateStr = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      if (dateStr !== lastDate) {
        nodes.push(<DateDivider key={`date-${dateStr}`} date={dateStr} />);
        lastDate = dateStr;
      }
      nodes.push(<Bubble key={msg.id} msg={msg} />);
    });

    return <>{nodes}</>;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pb-3 pt-3 border-b border-outline-variant bg-surface-container-high/80 backdrop-blur-xl shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <Avatar seed={avatarSeed} size={36} />
        <div className="flex-1">
          <p className="font-bold text-on-surface text-sm leading-tight">{nickname}</p>
          <p className="text-[10px] text-secondary font-medium">在线 · 睡友</p>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl border border-outline-variant bg-tertiary-container/70 p-4 text-sm text-on-surface-variant">
            当前还没有配置 Supabase，聊天页面已合并完成，但需要补上环境变量后才能真正收发消息。
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl animate-pulse opacity-40">chat_bubble</span>
            <p className="text-sm">加载中…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-on-surface-variant">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bedtime
              </span>
            </div>
            <p className="text-sm font-medium">和 {nickname} 打个招呼吧</p>
            <p className="text-xs opacity-60">你们都在努力补觉 💤</p>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={bottomRef} />
      </div>

      {/* 快捷回复 */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar"
          >
            {QUICK_REPLIES.map((text) => (
              <button
                key={text}
                onClick={() => handleQuickReply(text)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium hover:border-primary hover:text-primary transition-colors"
              >
                {text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入栏 */}
      <div className="px-4 pb-6 pt-2 border-t border-outline-variant bg-surface-container-high/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickReplies((v) => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showQuickReplies ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
          </button>

          <input
            ref={inputRef}
            className="flex-1 bg-surface-container-low rounded-full px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant border border-outline-variant focus:outline-none focus:border-primary transition-colors"
            placeholder="说点什么…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || sending || !isSupabaseConfigured}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <span
              className="material-symbols-outlined text-on-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
