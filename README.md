# 字流 MVP - 让文字如流水般顺畅发布

字流是一款AI驱动的多平台内容发布工具，帮助创作者一次创作，智能适配公众号、知乎、掘金、小红书等平台的格式要求。

## 🚀 MVP功能特性

### ✅ 已实现功能

- **用户认证系统**：注册、登录、会话管理
- **Markdown编辑器**：支持实时预览和自动保存
- **格式转换**：Markdown转公众号HTML格式
- **样式模板**：3套内置样式（默认、技术、简约）
- **Chrome插件**：一键填充公众号内容
- **响应式设计**：适配桌面和移动端

### 🔄 核心工作流程

1. **创作**：在字流网站使用Markdown编辑器创作内容
2. **预览**：实时查看公众号格式效果
3. **复制**：点击"复制到插件"按钮
4. **发布**：在公众号页面使用Chrome插件一键填充

## 🛠️ 技术栈

- **前端**：Next.js 14 + TypeScript + Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：SQLite (本地) / Turso (生产)
- **认证**：NextAuth.js
- **ORM**：Drizzle ORM
- **部署**：Vercel (零成本)

## 📦 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

复制 `.env.local` 文件并配置：

```bash
# 数据库配置 (开发环境使用本地SQLite)
DATABASE_URL="file:./dev.db"

# NextAuth 配置
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. 初始化数据库

```bash
npm run db:push
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000
