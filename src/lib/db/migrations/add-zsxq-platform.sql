-- 添加知识星球平台支持的数据库迁移

-- 更新平台枚举，添加 zsxq
-- 注意：SQLite 不支持直接修改枚举，需要重新创建表

-- 1. 创建新的临时表
CREATE TABLE publish_presets_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('wechat', 'zhihu', 'juejin', 'zsxq')),
  user_id TEXT NOT NULL,
  author_name TEXT,
  header_content TEXT,
  footer_content TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  platform_config TEXT, -- JSON 格式存储平台特定配置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 复制现有数据到新表
INSERT INTO publish_presets_new (
  id, name, platform, user_id, author_name, header_content, 
  footer_content, is_default, platform_config, created_at, updated_at
)
SELECT 
  id, name, platform, user_id, author_name, header_content, 
  footer_content, is_default, platform_config, created_at, updated_at
FROM publish_presets;

-- 3. 删除旧表
DROP TABLE publish_presets;

-- 4. 重命名新表
ALTER TABLE publish_presets_new RENAME TO publish_presets;

-- 5. 重新创建索引
CREATE INDEX idx_publish_presets_user_platform ON publish_presets(user_id, platform);
CREATE INDEX idx_publish_presets_user_default ON publish_presets(user_id, is_default);

-- 6. 插入知识星球平台的示例配置（可选）
-- INSERT INTO publish_presets (
--   id, name, platform, user_id, author_name, header_content, footer_content, 
--   is_default, platform_config
-- ) VALUES (
--   'zsxq-default-' || hex(randomblob(8)),
--   '知识星球默认设置',
--   'zsxq',
--   'system', -- 系统默认配置
--   '字流',
--   '👋 大家好，我是字流！',
--   '📝 本文由字流一键发布工具生成\n🔗 更多内容请关注我的其他平台',
--   TRUE,
--   '{"groupIds": ["28882842528281"]}'
-- );
