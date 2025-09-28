# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "字流" (Ziliu) - an AI-powered multi-platform content publishing tool. It allows users to write content once in Markdown and publish it to multiple platforms including WeChat Official Accounts, Zhihu, Juejin, Knowledge Planet (ZSXQ), CSDN, and Xiaohongshu. The project consists of a Next.js web application and a Chrome extension.

## Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build production version
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Database Operations
```bash
# Generate database migrations
npm run db:generate

# Execute database migrations
npm run db:migrate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio database management interface
npm run db:studio
```

### Testing & Debugging
```bash
# Test WeChat fill functionality
npm run test:wechat:fill

# Test WeChat CDP (Chrome DevTools Protocol)
npm run test:wechat:cdp

# Fix user plan (general)
npm run fix:plan

# Fix specific user plan
npm run fix:plan:me
```

### Infrastructure
```bash
# Create R2 bucket for image storage
npm run r2:create-bucket
```

### Storage Testing
```bash
# Test Qiniu cloud storage integration
node scripts/test-qiniu-upload.js
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.4 + React 19 + TypeScript 5.0
- **Styling**: Tailwind CSS 4.0 + Radix UI components
- **Database**: SQLite (dev) / Turso LibSQL (production) with Drizzle ORM
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3-compatible (Cloudflare R2)
- **Browser Automation**: Playwright + Chrome Extension

### Key Components

#### Web Application (`/src`)
- **App Router Structure**: `/src/app/` with API routes and page components
- **Core Libraries**:
  - `/src/lib/converter.ts` - Markdown to platform-specific HTML conversion with style templates
  - `/src/lib/auth.ts` - NextAuth.js configuration
  - `/src/lib/db/` - Database schema and connection management
  - `/src/lib/image-storage.ts` - Image upload to S3-compatible storage
- **Database Schema**: Users, articles, publish records, presets, redeem codes, image usage stats
- **Components**: Editor, UI components (shadcn/ui), platform-specific adapters

#### Chrome Extension (`/extension`)
- **Platform Plugins**: `/extension/plugins/platforms/` contains adapters for each platform
  - `wechat.js` - WeChat Official Account automation
  - `zhihu.js` - Zhihu publishing automation
  - `juejin.js` - Juejin community automation
  - `zsxq.js` - Knowledge Planet automation
  - `csdn.js` - CSDN platform automation
  - `xiaohongshu.js` - Xiaohongshu (Little Red Book) automation
- **Core System**: `/extension/core/` handles platform detection and content injection
- **Background Script**: Manages extension lifecycle and cross-tab communication

### Database Schema
- **Users**: User accounts with subscription plans (free/pro)
- **Articles**: Content storage with metadata
- **Publish Records**: Track publishing status across platforms
- **Publish Presets**: Save platform-specific configuration templates
- **Redeem Codes**: Subscription activation system
- **Image Usage Stats**: Track monthly image upload quotas

### Image Storage System
- **Multi-Provider Support**: Cloudflare R2 and Qiniu Cloud Storage
- **Intelligent Fallback**: Auto mode tries R2 first, falls back to Qiniu if R2 fails
- **Provider-Specific Features**:
  - Qiniu: Better performance in China, multiple availability zones
  - R2: S3-compatible API, global CDN
- **Smart Upload Logic**: `src/lib/services/image-service.ts` handles provider selection
- **Configuration**: `IMAGE_STORAGE_PROVIDER` environment variable controls behavior

## Development Environment Setup

### Prerequisites
- Node.js 18+
- SQLite for local development
- Chrome browser for extension testing

### Environment Variables
Required in `.env` file:
```bash
# Database
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="your-turso-url"      # Production only
TURSO_AUTH_TOKEN="your-turso-token"      # Production only

# Authentication
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Cloud Storage - Cloudflare R2
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-bucket-name"
R2_PUBLIC_URL="https://your-domain.com"

# Cloud Storage - Qiniu (七牛云)
QINIU_ACCESS_KEY="your-qiniu-access-key"
QINIU_SECRET_KEY="your-qiniu-secret-key"
QINIU_BUCKET="your-qiniu-bucket-name"
QINIU_DOMAIN="https://your-qiniu-domain.com"
QINIU_ZONE="Zone_z2"  # Zone_z0(华东), Zone_z1(华北), Zone_z2(华南), Zone_na0(北美), Zone_as0(东南亚)

# Image Storage Provider Selection
IMAGE_STORAGE_PROVIDER="qiniu"  # Options: r2 | qiniu | auto
# auto: Try R2 first, fallback to Qiniu if R2 fails
```

### Chrome Extension Development
1. Load extension in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → select `/extension` directory
2. Extension automatically detects supported platforms and shows injection UI
3. Test platform plugins individually using the debug pages

## Important Development Notes

### Code Patterns
- Use Drizzle ORM for all database operations
- Follow Next.js App Router conventions
- Platform plugins should extend the base platform class
- All user content goes through the converter system for platform adaptation

### Platform Integration
- Each platform has unique automation requirements in its plugin file
- Platform detection happens automatically via URL patterns
- Content styling is platform-specific and defined in converter templates

### Subscription System
- Free users: WeChat Official Account access only
- Pro users: All platforms unlocked
- Redeem code system for subscription activation
- Image upload quotas tracked monthly

### Security Considerations
- Never commit `.env` files with real credentials
- Platform plugins run in isolated content script contexts
- User content is sanitized before platform injection