#!/bin/bash

# 字流 MVP 项目快速搭建脚本
# 使用方法: bash setup-mvp.sh

set -e

echo "🚀 开始搭建字流 MVP 项目..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js (推荐版本 18+)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，请升级到 18+ 版本"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 创建项目目录
PROJECT_NAME="ziliu-mvp"
if [ -d "$PROJECT_NAME" ]; then
    echo "❌ 目录 $PROJECT_NAME 已存在，请删除后重试"
    exit 1
fi

echo "📁 创建 Next.js 项目..."
npx create-next-app@latest $PROJECT_NAME --typescript --tailwind --app --yes

cd $PROJECT_NAME

echo "📦 安装核心依赖..."
npm install drizzle-orm @libsql/client next-auth @auth/drizzle-adapter
npm install marked bcryptjs zod lucide-react
npm install -D drizzle-kit @types/bcryptjs

echo "📝 创建项目结构..."

# 创建目录结构
mkdir -p src/components/ui
mkdir -p src/components/editor
mkdir -p src/components/auth
mkdir -p src/components/layout
mkdir -p src/lib
mkdir -p drizzle
mkdir -p extension

# 创建基础配置文件
cat > .env.local << 'EOF'
# 数据库配置 (请替换为你的 Turso 配置)
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"

# NextAuth 配置
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# 开发环境数据库
DATABASE_URL="file:./dev.db"
EOF

# 创建 Drizzle 配置
cat > drizzle.config.ts << 'EOF'
import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'libsql',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
EOF

# 创建数据库 Schema
cat > drizzle/schema.ts << 'EOF'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
EOF

# 创建数据库连接文件
cat > src/lib/db.ts << 'EOF'
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../../drizzle/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
EOF

# 创建工具函数
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# 创建格式转换器
cat > src/lib/converter.ts << 'EOF'
import { marked } from 'marked';

const WECHAT_STYLE = `
  <style>
    .wechat-content { 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.8;
      color: #333;
      max-width: 100%;
    }
    .wechat-content h1 { 
      color: #2c3e50; 
      border-bottom: 2px solid #3498db; 
      padding-bottom: 8px;
      margin: 24px 0 16px 0;
    }
    .wechat-content h2 { 
      color: #34495e; 
      border-left: 4px solid #3498db; 
      padding-left: 12px;
      margin: 20px 0 12px 0;
    }
    .wechat-content p { 
      margin: 16px 0; 
      text-align: justify;
    }
    .wechat-content code { 
      background: #f8f9fa; 
      padding: 2px 6px; 
      border-radius: 3px; 
      font-family: 'SF Mono', Monaco, monospace;
      color: #e74c3c;
    }
    .wechat-content pre {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .wechat-content blockquote {
      border-left: 4px solid #bdc3c7;
      padding-left: 16px;
      margin: 16px 0;
      color: #7f8c8d;
      font-style: italic;
    }
  </style>
`;

export function convertToWechat(markdown: string): string {
  const html = marked(markdown);
  return `
    ${WECHAT_STYLE}
    <div class="wechat-content">
      ${html}
    </div>
  `;
}
EOF

# 更新 package.json 脚本
npm pkg set scripts.db:generate="drizzle-kit generate"
npm pkg set scripts.db:migrate="drizzle-kit migrate"
npm pkg set scripts.db:studio="drizzle-kit studio"

echo "🎉 项目搭建完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. cd $PROJECT_NAME"
echo "2. 配置 .env.local 文件中的数据库连接"
echo "3. npm run dev 启动开发服务器"
echo ""
echo "📚 详细文档："
echo "- MVP快速启动指南: docs/mvp-guide.md"
echo "- 技术架构文档: docs/architecture.md"
echo ""
echo "🚀 开始你的字流 MVP 之旅吧！"
