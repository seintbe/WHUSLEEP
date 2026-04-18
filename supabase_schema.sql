-- ================================================
-- WHUSLEEP 社交功能数据库初始化脚本
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  nickname    TEXT NOT NULL DEFAULT '睡眠星球用户',
  avatar_seed TEXT NOT NULL DEFAULT '',
  campus      TEXT NOT NULL DEFAULT 'WHU',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 用户实时状态表
CREATE TABLE IF NOT EXISTS user_presence (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online     BOOLEAN NOT NULL DEFAULT true,
  lat           FLOAT8,
  lng           FLOAT8,
  sleep_debt_key FLOAT4 NOT NULL DEFAULT 0,  -- 精度 0.5h
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- 4. 消息表
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- 索引
-- ================================================
CREATE INDEX IF NOT EXISTS idx_presence_online ON user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_presence_debt ON user_presence(sleep_debt_key) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC);

-- ================================================
-- 开启实时订阅（Supabase Realtime）
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;

-- ================================================
-- 行级安全（RLS）—— 简化版，适合校园内应用
-- ================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 所有人可读用户和状态（匿名应用场景）
CREATE POLICY "users_read_all" ON users FOR SELECT USING (true);
CREATE POLICY "presence_read_all" ON user_presence FOR SELECT USING (true);
CREATE POLICY "friendships_read_all" ON friendships FOR SELECT USING (true);
CREATE POLICY "messages_read_all" ON messages FOR SELECT USING (true);

-- 插入/更新只需提供有效 user_id（前端通过 anon key 操作）
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
CREATE POLICY "presence_upsert" ON user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "presence_update" ON user_presence FOR UPDATE USING (true);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "friendships_update" ON friendships FOR UPDATE USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (true);
