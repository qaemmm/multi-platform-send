import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 文章表
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  wordCount: integer('word_count').default(0),
  readingTime: integer('reading_time').default(0), // 预计阅读时间（分钟）
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 发布记录表
export const publishRecords = sqliteTable('publish_records', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: ['wechat', 'zhihu', 'juejin', 'xiaohongshu'] }).notNull(),
  status: text('status', { enum: ['pending', 'success', 'failed'] }).notNull().default('pending'),
  platformArticleId: text('platform_article_id'), // 平台返回的文章ID
  platformUrl: text('platform_url'), // 发布后的URL
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type PublishRecord = typeof publishRecords.$inferSelect;
export type NewPublishRecord = typeof publishRecords.$inferInsert;
