-- 添加平台支持的migration
-- 为发布预设表添加平台字段和平台特定配置

-- 添加platform字段，默认为wechat（向后兼容）
ALTER TABLE `publish_presets` ADD `platform` text DEFAULT 'wechat' NOT NULL;

-- 添加平台特定配置字段（JSON格式）
ALTER TABLE `publish_presets` ADD `platform_config` text;

-- 为现有数据设置默认平台
UPDATE `publish_presets` SET `platform` = 'wechat' WHERE `platform` IS NULL;
