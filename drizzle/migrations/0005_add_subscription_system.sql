-- 添加用户订阅字段
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro'));
ALTER TABLE users ADD COLUMN plan_expired_at INTEGER;

-- 创建兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('monthly', 'yearly')),
  duration INTEGER NOT NULL,
  is_used INTEGER NOT NULL DEFAULT 0,
  used_by TEXT REFERENCES users(id),
  used_at INTEGER,
  created_by TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used ON redeem_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used_by ON redeem_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_plan_expired_at ON users(plan_expired_at);