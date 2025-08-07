CREATE TABLE `publish_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false,
	`author_name` text,
	`is_original` integer DEFAULT true,
	`enable_reward` integer DEFAULT false,
	`enable_comment` integer DEFAULT true,
	`featured_articles` text,
	`source_info` text,
	`original_link` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
