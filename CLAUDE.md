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

# Create pro user (development)
node scripts/create-pro-user.mjs

# Fix password hash issues
node scripts/fix-password-hash.mjs

# Test Qiniu cloud storage integration
node scripts/test-qiniu-upload.js

# Test Qiniu configuration and connectivity
node scripts/test-qiniu-config.mjs

# Update Qiniu configuration
node scripts/update-qiniu-config.mjs

# Quick domain connectivity test
node scripts/quick-test-domain.mjs

# Create admin user for development
node scripts/create-admin-user.js

# Final configuration test
node scripts/final-config-test.mjs
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
- **Multi-Provider Support**: Cloudflare R2 and Qiniu Cloud Storage with intelligent fallback
- **Provider Selection**: `IMAGE_STORAGE_PROVIDER` environment variable controls behavior (r2 | qiniu | auto)
  - `auto`: Try R2 first, fallback to Qiniu if R2 fails
  - `r2`: Use Cloudflare R2 exclusively
  - `qiniu`: Use Qiniu Cloud Storage exclusively
- **Provider-Specific Features**:
  - **Qiniu**: Better performance in China, multiple availability zones (Zone_z0华东, Zone_z1华北, Zone_z2华南, Zone_na0北美, Zone_as0东南亚)
  - **R2**: S3-compatible API, global CDN via Cloudflare
- **Smart Upload Logic**: `src/lib/services/image-service.ts` handles provider selection and failover
- **Quota Management**: Free users (20 images/month), Pro users (500 images/month)
- **Image Processing**: Automatic format validation, size limits, and URL conversion

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
# TURSO_DATABASE_URL="libsql://your-database-name.turso.io"      # Production only - comment out for local dev
# TURSO_AUTH_TOKEN="your-turso-auth-token"      # Production only - comment out for local dev

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"

# Cloud Storage - Cloudflare R2
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="ziliu"
R2_PUBLIC_URL="https://your-domain.com"

# Cloud Storage - Qiniu (七牛云)
QINIU_ACCESS_KEY="your-qiniu-access-key"
QINIU_SECRET_KEY="your-qiniu-secret-key"
QINIU_BUCKET="your-qiniu-bucket-name"
QINIU_DOMAIN="https://your-qiniu-domain.com"
QINIU_ZONE="Zone_as0"  # Zone_z0(华东), Zone_z1(华北), Zone_z2(华南), Zone_na0(北美), Zone_as0(东南亚)

# Image Storage Provider Selection
IMAGE_STORAGE_PROVIDER="qiniu"  # Options: r2 | qiniu | auto
```

**Important Notes:**
- For local development, comment out `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to use SQLite
- The application will automatically fallback to local SQLite when Turso credentials are not available
- Qiniu is currently configured as the default storage provider for better performance in China

### Chrome Extension Development
1. Load extension in Chrome: `chrome://extensions/` → Developer mode → Load unpacked → select `/extension` directory
2. Extension automatically detects supported platforms and shows injection UI
3. Test platform plugins individually using the debug pages
4. Each platform plugin (`wechat.js`, `zhihu.js`, `juejin.js`, `zsxq.js`, `csdn.js`, `xiaohongshu.js`) handles automation for that specific platform

**Extension Architecture:**
- **Content Scripts**: Platform-specific automation with URL pattern matching
- **Core Services**: Event bus, API communication, subscription management
- **Plugin System**: Extensible platform adapters with base class inheritance
- **Background Script**: Cross-tab communication and lifecycle management

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
- All platforms are currently available to both free and pro users (recent change)

### Subscription System
- **Free users**: All platforms currently available (recent policy change)
- **Pro users**: Additional features like advanced styles, publish presets, higher quotas
- **Feature-based access**: Granular control via `src/lib/subscription/config/features.ts`
- **Quota Management**: Image uploads (free: 20/month, pro: 500/month)
- **Redeem Codes**: Subscription activation system
- **User Management**: Scripts available in `/scripts/` directory for development and debugging

### Content Conversion System
- **Markdown to HTML**: Platform-specific conversion with style templates
- **Style Templates**: Default, Technical, and Minimal styles for different content types
- **Image Processing**: Automatic URL conversion and upload handling
- **Code Highlighting**: Platform-specific syntax highlighting
- **Content Adaptation**: Automatic formatting for each platform's requirements

### Security Considerations
- Never commit `.env` files with real credentials
- Platform plugins run in isolated content script contexts
- User content is sanitized before platform injection
- Database passwords are hashed using bcryptjs
- API routes include proper authentication and authorization checks
- File uploads are validated for size and type restrictions

### Database Connection Notes
- **Development**: Uses local SQLite database (`dev.db`) when Turso credentials are not available
- **Production**: Uses Turso (LibSQL) for distributed SQLite functionality
- **Fallback Logic**: Comment out Turso credentials in `.env` to force local SQLite usage
- **Migrations**: Use `npm run db:push` for schema changes, `npm run db:studio` for management