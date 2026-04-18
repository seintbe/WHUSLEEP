/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAppStore, type MessageCategory } from '@/store';
import { getDailyQuote } from '@/lib/layFlatQuotes';

// 留言板页面 - 社交留言和点赞功能
// TODO: 每天点赞最多的留言第二天出现在"幽默语句"模块置顶
// 实现思路：
// 1. 后端定时任务统计每日点赞数
// 2. 取点赞数最高的留言内容
// 3. 存入每日幽默语句表
// 4. 前端"幽默语句"模块优先展示该置顶内容

export default function MessageBoard() {
  const { messages, addMessage, toggleLike, addReply, toggleReplyLike, currentUserId } = useAppStore();
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory>('experience');
  const [anonymous, setAnonymous] = useState(false);
  const [filterCategory, setFilterCategory] = useState<MessageCategory | 'all'>('all');
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);

  const handlePostMessage = () => {
    if (!newMessage.trim() || !authorName.trim()) return;

    addMessage({
      content: newMessage.trim(),
      author: authorName.trim(),
      category: selectedCategory,
      anonymous: anonymous,
    });

    setNewMessage('');
    setAuthorName('');
    setSelectedCategory('experience');
    setAnonymous(false);
    setShowPostForm(false);
  };

  const handleLike = (messageId: string) => {
    toggleLike(messageId, currentUserId);
  };

  const handleReply = (messageId: string) => {
    if (!replyContent.trim() || !authorName.trim()) return;

    addReply(messageId, {
      content: replyContent.trim(),
      author: authorName.trim(),
      anonymous: replyAnonymous,
    });

    setReplyContent('');
    setReplyAnonymous(false);
    setShowReplyForm(null);
  };

  const handleReplyLike = (messageId: string, replyId: string) => {
    toggleReplyLike(messageId, replyId, currentUserId);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getCategoryLabel = (category: MessageCategory) => {
    const labels = {
      checkin: '打卡',
      experience: '心得',
      complaint: '吐槽',
      anonymous: '匿名倾诉',
    };
    return labels[category];
  };

  const getCategoryColor = (category: MessageCategory) => {
    const colors = {
      checkin: 'bg-green-100 text-green-700',
      experience: 'bg-blue-100 text-blue-700',
      complaint: 'bg-red-100 text-red-700',
      anonymous: 'bg-purple-100 text-purple-700',
    };
    return colors[category];
  };

  // 过滤和排序留言
  const filteredMessages = filterCategory === 'all' 
    ? messages 
    : messages.filter(msg => msg.category === filterCategory);
  
  const sortedMessages = [...filteredMessages].sort((a, b) => b.likes - a.likes);

  // 统计今日打卡人数
  const today = new Date().toISOString().split('T')[0];
  const todayCheckins = messages.filter(msg => 
    msg.category === 'checkin' && 
    new Date(msg.timestamp).toISOString().split('T')[0] === today
  ).length;

  return (
    <div className="px-6 max-w-2xl mx-auto pb-10">
      {/* Header */}
      <section className="mb-8">
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
          睡了么留言板
        </h2>
        <p className="text-sm text-on-surface-variant">
          分享你的睡眠心得、熬夜吐槽、或是早睡心得~
        </p>
        <div className="mt-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-on-surface-variant/60">今日打卡</p>
              <p className="text-xl font-bold text-on-surface">{todayCheckins} 人</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-on-surface-variant/60">总留言数</p>
              <p className="text-xl font-bold text-on-surface">{messages.length} 条</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-on-surface-variant/60">活跃睡友</p>
              <p className="text-xl font-bold text-on-surface">{new Set(messages.map(msg => msg.author)).size} 人</p>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Humor Section - 幽默语句模块预留位置 */}
      <section className="mb-8 bg-primary-container/30 p-5 rounded-2xl border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            sentiment_very_satisfied
          </span>
          <h3 className="font-bold text-on-surface">今日幽默</h3>
        </div>
        <p className="text-on-surface-variant text-sm italic">
          "{getDailyQuote()}"
        </p>
        <p className="text-xs text-on-surface-variant/60 mt-2">
          {/* TODO: 这里展示昨天点赞最多的留言内容 */}
          每日更新 · 来自睡友社区
        </p>
      </section>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
            filterCategory === 'all' 
              ? 'bg-primary text-on-primary' 
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          全部
        </button>
        {(['checkin', 'experience', 'complaint', 'anonymous'] as MessageCategory[]).map(category => (
          <button
            key={category}
            onClick={() => setFilterCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filterCategory === category 
                ? getCategoryColor(category) + ' font-bold' 
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {getCategoryLabel(category)}
          </button>
        ))}
      </div>

      {/* Post Message Button */}
      <button
        onClick={() => setShowPostForm(true)}
        className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl mb-6 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          edit
        </span>
        发表留言
      </button>

      {/* Post Message Modal */}
      {showPostForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-3xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,0,0,0.15)]"
          >
            <h2 className="text-xl font-bold text-on-surface mb-6">发表留言</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant font-bold mb-2">昵称</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-surface-container-low p-3 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="睡友昵称"
                />
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant font-bold mb-2">分类</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['checkin', 'experience', 'complaint', 'anonymous'] as MessageCategory[]).map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedCategory === category 
                          ? getCategoryColor(category) + ' border-2 border-current' 
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant'
                      }`}
                    >
                      {getCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-on-surface-variant font-bold mb-2">留言内容</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  maxLength={200}
                  rows={4}
                  className="w-full bg-surface-container-low p-3 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={selectedCategory === 'checkin' ? '记录今日作息：入睡时间、起床时间、睡眠质量...' : 
                               selectedCategory === 'experience' ? '分享你的助眠心得、入睡小方法...' : 
                               selectedCategory === 'complaint' ? '吐槽失眠困扰、熬夜烦恼...' : 
                               '匿名倾诉你的心事、压力...'}
                />
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  {newMessage.length}/200 字
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-outline focus:ring-primary"
                />
                <label htmlFor="anonymous" className="text-sm text-on-surface-variant cursor-pointer">
                  匿名发表
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePostMessage}
                  disabled={!newMessage.trim() || !authorName.trim()}
                  className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发布
                </button>
                <button
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 bg-surface-container-low text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Messages List */}
      <section>
        <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">forum</span>
          {filterCategory === 'all' ? '热门留言' : getCategoryLabel(filterCategory as MessageCategory)}
        </h3>

        {sortedMessages.length === 0 ? (
          <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant text-center">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl mb-3">
              chat_bubble_outline
            </span>
            <p className="text-on-surface-variant">还没有留言，快来发表第一条吧！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedMessages.map((message, index) => {
              const isLiked = message.likedBy.includes(currentUserId);
              const isTop = index === 0 && message.likes > 0;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-surface-container-low p-5 rounded-2xl border ${isTop ? 'border-primary shadow-[0_0_15px_rgba(56,189,248,0.15)]' : 'border-outline-variant'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${getCategoryColor(message.category)}`}>
                        {getCategoryLabel(message.category)}
                      </span>
                      {isTop && (
                        <span className="px-2 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-full">
                          🔥 今日最热
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                        <span className="text-secondary font-bold text-sm">
                          {message.anonymous ? '匿' : message.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{message.anonymous ? '匿名用户' : message.author}</p>
                        <p className="text-xs text-on-surface-variant/60">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
                    {message.content}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLike(message.id)}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm transition-all ${
                        isLiked
                          ? 'bg-error-container text-error'
                          : 'bg-surface-container-high text-on-surface-variant hover:bg-error-container/50'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                      <span>{message.likes}</span>
                    </button>
                    <button
                      onClick={() => setShowReplyForm(showReplyForm === message.id ? null : message.id)}
                      className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-surface-container-high text-on-surface-variant hover:bg-surface-container transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">
                        reply
                      </span>
                      <span>回复</span>
                    </button>
                  </div>

                  {/* Reply Form */}
                  {showReplyForm === message.id && (
                    <div className="mt-4 p-4 bg-surface-container rounded-xl border border-outline-variant">
                      <div className="space-y-3">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          maxLength={100}
                          rows={2}
                          className="w-full bg-surface p-3 rounded-xl border border-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder="写下你的回复..."
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`reply-anonymous-${message.id}`}
                              checked={replyAnonymous}
                              onChange={(e) => setReplyAnonymous(e.target.checked)}
                              className="w-4 h-4 rounded border-outline focus:ring-primary"
                            />
                            <label htmlFor={`reply-anonymous-${message.id}`} className="text-xs text-on-surface-variant cursor-pointer">
                              匿名回复
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowReplyForm(null)}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleReply(message.id)}
                              disabled={!replyContent.trim()}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {message.replies && message.replies.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {message.replies.map((reply) => {
                        const isReplyLiked = reply.likedBy.includes(currentUserId);
                        return (
                          <div key={reply.id} className="p-3 bg-surface-container rounded-xl border border-outline-variant">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center">
                                  <span className="text-secondary font-bold text-xs">
                                    {reply.anonymous ? '匿' : reply.author.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-bold text-on-surface text-xs">{reply.anonymous ? '匿名用户' : reply.author}</p>
                                  <p className="text-xs text-on-surface-variant/60">{formatTime(reply.timestamp)}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-on-surface-variant text-xs leading-relaxed mb-2">
                              {reply.content}
                            </p>
                            <button
                              onClick={() => handleReplyLike(message.id, reply.id)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all ${
                                isReplyLiked
                                  ? 'bg-error-container text-error'
                                  : 'bg-surface-container-high text-on-surface-variant hover:bg-error-container/50'
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-xs"
                                style={{ fontVariationSettings: isReplyLiked ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                favorite
                              </span>
                              <span>{reply.likes}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Placeholder sections for other modules */}
      {/* 模块预留：定制化睡眠方案 */}
      <section className="mt-8 bg-surface-container-low p-6 rounded-2xl border border-outline-variant opacity-60">
        <h3 className="font-bold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined">route</span>
          定制化睡眠方案
        </h3>
        <p className="text-sm text-on-surface-variant">规划你的专属睡眠路径 · 模块开发中...</p>
      </section>

      {/* 模块预留：多方睡友 */}
      <section className="mt-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant opacity-60">
        <h3 className="font-bold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined">groups</span>
          多方睡友
        </h3>
        <p className="text-sm text-on-surface-variant">实时匹配 · 一起享受高质量睡眠 · 模块开发中...</p>
      </section>

      {/* 模块预留：AI睡眠医生 */}
      <section className="mt-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant opacity-60">
        <h3 className="font-bold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined">smart_toy</span>
          AI睡眠医生
        </h3>
        <p className="text-sm text-on-surface-variant">智能诊断 · 专业建议 · 模块开发中...</p>
      </section>
    </div>
  );
}
