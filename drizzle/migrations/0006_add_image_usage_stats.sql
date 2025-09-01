CREATE TABLE `image_usage_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`month` text NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建复合索引以提高查询性能
CREATE UNIQUE INDEX `idx_user_month` ON `image_usage_stats` (`user_id`, `month`);