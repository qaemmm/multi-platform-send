ALTER TABLE `publish_presets` ADD `auto_select_cover` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `publish_presets` ADD `auto_generate_digest` integer DEFAULT true;--> statement-breakpoint
ALTER TABLE `publish_presets` DROP COLUMN `enable_comment`;--> statement-breakpoint
ALTER TABLE `publish_presets` DROP COLUMN `featured_articles`;--> statement-breakpoint
ALTER TABLE `publish_presets` DROP COLUMN `source_info`;--> statement-breakpoint
ALTER TABLE `publish_presets` DROP COLUMN `original_link`;