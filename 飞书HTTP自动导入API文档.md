# 🚀 Ziliu 飞书HTTP自动导入API文档

## 📋 概述

本文档描述了通过HTTP请求将飞书内容自动导入到Ziliu系统的技术方案。外部系统可以直接发送内容到API，系统会自动处理内容、上传图片并保存为文章草稿，然后通过浏览器插件即可在各平台使用。

**核心优势：**
- 自动化内容导入流水线
- 保持原有格式和图片
- 无需手动复制粘贴
- 与现有插件生态完美集成

---

## 🎯 数据格式选择

### ✅ 推荐：HTML格式

**优势：**
- ✅ 保持原有格式（标题、段落、列表、图片等）
- ✅ 与现有飞书解析逻辑完全兼容
- ✅ 支持复杂的排版和样式
- ✅ 图片处理逻辑已成熟稳定

**劣势：**
- ❌ 数据体积稍大（可忽略）
- ❌ 需要HTML解析（已有现成逻辑）

### ⚠️ 备选：Markdown格式

**优势：**
- ✅ 数据简洁
- ✅ 无需解析，直接使用

**劣势：**
- ❌ 失去格式信息
- ❌ 图片处理复杂
- ❌ 与现有逻辑不兼容

### ❌ 不推荐：纯文本格式

**优势：**
- ✅ 最简单

**劣势：**
- ❌ 丢失所有格式
- ❌ 需要重新排版
- ❌ 用户体验差

**🏆 最终结论：强烈推荐使用HTML格式**

---

## 📡 API接口设计

### 端点信息
```
POST /api/feishu/auto-import
Content-Type: application/json
Authorization: Bearer {api_key}
```

### 请求格式

#### 请求头
```http
Content-Type: application/json
Authorization: Bearer your-secret-api-key
```

#### 请求体
```json
{
  "title": "文章标题（可选）",
  "content": "<h1>HTML内容</h1><p>文章内容</p>",
  "source": "feishu",
  "auto_publish": false,
  "platforms": ["wechat", "zhihu"],
  "metadata": {
    "author": "作者名",
    "tags": ["标签1", "标签2"],
    "summary": "文章摘要"
  }
}
```

#### 字段说明
| 字段 | 类型 | 必需 | 说明 | 默认值 |
|------|------|------|------|--------|
| `title` | string | ❌ | 文章标题，如不提供将从HTML提取 | 自动提取 |
| `content` | string | ✅ | HTML格式的文章内容 | - |
| `source` | string | ❌ | 来源标识 | `"feishu"` |
| `auto_publish` | boolean | ❌ | 是否自动设为发布状态 | `false` |
| `platforms` | array | ❌ | 目标平台列表 | `[]` |
| `metadata` | object | ❌ | 额外元数据 | `{}` |

### 响应格式

#### 成功响应
```json
{
  "success": true,
  "article_id": "article_123456",
  "title": "导入的文章标题",
  "status": "draft",
  "image_count": 3,
  "processed_images": 3,
  "message": "文章已成功导入并保存",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "error_code": "ERROR_CODE"
}
```

#### 错误代码说明
| 错误代码 | 说明 | HTTP状态码 |
|----------|------|------------|
| `UNAUTHORIZED` | API密钥无效或缺失 | 401 |
| `MISSING_CONTENT` | 缺少必要的内容字段 | 400 |
| `INVALID_FORMAT` | 内容格式无效 | 400 |
| `CONTENT_TOO_LARGE` | 内容大小超过限制 | 413 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 🔧 实现步骤

### 1. 环境配置

在 `.env.local` 中添加：
```bash
# 飞书自动导入API密钥
FEISHU_IMPORT_API_KEY=your-secret-key-here

# 可选：内容大小限制（字节）
FEISHU_IMPORT_MAX_SIZE=10485760  # 10MB
```

### 2. 创建API端点

文件：`src/app/api/feishu/auto-import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db, articles } from '@/lib/db';
import { parseFeishuContent } from '../parse-feishu/route';

// API认证
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
  return apiKey === process.env.FEISHU_IMPORT_API_KEY;
}

// 内容大小验证
function validateContentSize(content: string): boolean {
  const maxSize = parseInt(process.env.FEISHU_IMPORT_MAX_SIZE || '10485760');
  return Buffer.byteLength(content, 'utf8') <= maxSize;
}

// 从HTML提取标题
function extractTitleFromHtml(html: string): string | null {
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 验证API密钥
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: '未授权访问', error_code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const {
      title,
      content,
      source = 'feishu',
      auto_publish = false,
      platforms = [],
      metadata = {}
    } = body;

    // 3. 验证必要字段
    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空', error_code: 'MISSING_CONTENT' },
        { status: 400 }
      );
    }

    // 4. 验证内容大小
    if (!validateContentSize(content)) {
      return NextResponse.json(
        { success: false, error: '内容大小超过限制', error_code: 'CONTENT_TOO_LARGE' },
        { status: 413 }
      );
    }

    // 5. 处理内容（复用现有逻辑）
    const session = { user: { email: 'api@import.com' } }; // API专用会话
    const result = await parseFeishuContent(content, session);

    // 6. 提取或生成标题
    const finalTitle = title || extractTitleFromHtml(content) || '未命名文章';

    // 7. 保存文章到数据库
    const [article] = await db.insert(articles).values({
      title: finalTitle,
      content: result.markdown,
      userId: 'api-user-id', // 或创建专用API用户ID
      status: auto_publish ? 'published' : 'draft',
      wordCount: result.markdown.length,
      readingTime: Math.ceil(result.markdown.length / 500),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // 8. 记录来源信息（可选）
    if (source || Object.keys(metadata).length > 0) {
      console.log(`文章 ${article.id} 来源: ${source}`, metadata);
    }

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      article_id: article.id,
      title: article.title,
      status: article.status,
      image_count: result.imageCount || 0,
      processed_images: result.processedImages || 0,
      message: result.imageWarning
        ? `文章已导入，注意：${result.imageWarning}`
        : '文章已成功导入并保存',
      created_at: article.createdAt,
    });

  } catch (error) {
    console.error('飞书自动导入失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        error_code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
```

### 3. 插件端集成

#### API服务扩展
在 `extension/core/api-service.js` 中添加：

```javascript
get userArticles() {
  return {
    // 获取用户文章列表
    list: async (options = {}) => {
      const params = new URLSearchParams({
        status: options.status || 'draft',
        limit: options.limit || '20',
        ...options
      });
      return this.cachedRequest(`/api/user/articles?${params}`);
    },

    // 获取单篇文章详情
    get: async (id) => {
      return this.cachedRequest(`/api/user/articles/${id}`);
    },

    // 填充文章到编辑器
    fillToEditor: async (id) => {
      const article = await this.get(id);
      if (article.success) {
        // 使用现有的填充逻辑
        return this.handleFillContent(article.data);
      }
      return article;
    },

    // 删除文章
    delete: async (id) => {
      return this.makeRequest(`/api/user/articles/${id}`, {
        method: 'DELETE'
      });
    }
  };
}
```

#### UI组件扩展
在插件中添加文章选择界面：

```javascript
// 显示用户文章列表
async showUserArticles() {
  const response = await ZiliuApiService.userArticles.list({
    status: 'draft',
    limit: 10
  });

  if (response.success) {
    this.renderArticleList(response.data);
  }
}

// 渲染文章列表UI
renderArticleList(articles) {
  const listHtml = articles.map(article => `
    <div class="article-item" data-id="${article.id}">
      <div class="article-title">${article.title}</div>
      <div class="article-meta">
        ${article.wordCount}字 · ${new Date(article.createdAt).toLocaleDateString()}
      </div>
      <button class="use-article-btn" data-id="${article.id}">
        使用此文章
      </button>
    </div>
  `).join('');

  // 插入到面板中
  this.insertArticleListUI(listHtml);
}

// 使用选中文章
async useArticle(articleId) {
  const result = await ZiliuApiService.userArticles.fillToEditor(articleId);
  if (result.success) {
    this.showSuccess('文章已加载到编辑器');
    this.closeArticleList();
  }
}
```

---

## 🚀 使用示例

### 1. cURL测试

```bash
# 基础导入
curl -X POST https://your-domain.com/api/feishu/auto-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key" \
  -d '{
    "title": "我的飞书文章",
    "content": "<h1>Hello World</h1><p>这是文章内容</p>",
    "source": "feishu-test"
  }'

# 带图片的导入
curl -X POST https://your-domain.com/api/feishu/auto-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key" \
  -d '{
    "title": "带图片的文章",
    "content": "<h1>图文混排</h1><p>文章内容</p><img src=\"https://example.com/image.jpg\" alt=\"示例图片\" />",
    "source": "feishu"
  }'
```

### 2. JavaScript调用

```javascript
// 导入函数
async function importToZiliu(title, htmlContent, options = {}) {
  const response = await fetch('https://your-domain.com/api/feishu/auto-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      title: title,
      content: htmlContent,
      source: options.source || 'external-system',
      auto_publish: options.autoPublish || false,
      platforms: options.platforms || [],
      metadata: options.metadata || {}
    })
  });

  return await response.json();
}

// 使用示例1：基础导入
const result1 = await importToZiliu(
  '测试文章',
  '<h1>Hello World</h1><p>这是从外部系统导入的内容</p>'
);

// 使用示例2：带元数据的导入
const result2 = await importToZiliu(
  '技术分享',
  '<h1>新技术介绍</h1><p>详细内容...</p>',
  {
    source: 'company-wiki',
    metadata: {
      author: '张三',
      tags: ['技术', '分享'],
      summary: '关于新技术的详细介绍'
    }
  }
);

console.log('导入结果:', result2);
```

### 3. 飞书机器人集成

```javascript
// 飞书文档更新机器人
class FeishuBot {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://your-domain.com/api/feishu/auto-import';
  }

  // 处理文档更新事件
  async handleDocUpdate(docId) {
    try {
      // 1. 获取飞书文档内容
      const docContent = await this.getFeishuDocContent(docId);

      // 2. 导入到Ziliu
      const result = await this.importToZiliu(
        docContent.title,
        docContent.html,
        {
          source: 'feishu-bot',
          metadata: {
            docId: docId,
            author: docContent.author,
            updateTime: docContent.updateTime
          }
        }
      );

      if (result.success) {
        console.log(`✅ 文章已保存: ${result.article_id}`);

        // 3. 可选：通知用户
        await this.notifyUser(result.article_id);
      } else {
        console.error('❌ 导入失败:', result.error);
      }
    } catch (error) {
      console.error('❌ 处理文档更新失败:', error);
    }
  }

  // 导入到Ziliu
  async importToZiliu(title, content, options = {}) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        title,
        content,
        ...options
      })
    });

    return await response.json();
  }

  // 获取飞书文档内容（示例）
  async getFeishuDocContent(docId) {
    // 这里需要调用飞书API获取文档内容
    // 返回格式：{ title: string, html: string, author: string, ... }
    // 具体实现取决于飞书API
  }

  // 通知用户
  async notifyUser(articleId) {
    // 发送通知给用户，比如飞书消息、邮件等
  }
}

// 使用机器人
const bot = new FeishuBot('your-api-key');
bot.handleDocUpdate('doc_123456');
```

### 4. Zapier/IFTTT集成

```javascript
// Webhook处理器（用于Zapier/IFTTT）
export async function POST(request) {
  const zapierData = await request.json();

  // 转换数据格式
  const result = await fetch('https://your-domain.com/api/feishu/auto-import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ZAPIER_API_KEY}`
    },
    body: JSON.stringify({
      title: zapierData.title || '来自Zapier的文章',
      content: zapierData.content,
      source: 'zapier',
      metadata: {
        zapId: zapierData.zap_id,
        trigger: zapierData.trigger
      }
    })
  });

  const data = await result.json();
  return Response.json(data);
}
```

---

## 🔒 安全考虑

### 1. API密钥管理

```typescript
// 生成安全的API密钥
function generateApiKey(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// 验证API密钥格式
function isValidApiKeyFormat(key: string): boolean {
  return /^[a-f0-9]{64}$/.test(key);
}

// 支持多个API密钥
const validApiKeys = [
  process.env.FEISHU_IMPORT_API_KEY,
  process.env.ZAPIER_API_KEY,
  // 可以添加更多密钥
];
```

### 2. 请求频率限制

```typescript
// 简单的内存频率限制
const rateLimit = new Map();

function checkRateLimit(ip: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];

  // 清理过期记录
  const recentRequests = requests.filter(time => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false; // 超过限制
  }

  rateLimit.set(ip, [...recentRequests, now]);
  return true;
}

// 在API中使用
const clientIp = request.ip || request.headers.get('x-forwarded-for');
if (!checkRateLimit(clientIp)) {
  return NextResponse.json(
    { success: false, error: '请求过于频繁', error_code: 'RATE_LIMITED' },
    { status: 429 }
  );
}
```

### 3. 内容安全验证

```typescript
// 验证HTML内容
function sanitizeHtml(html: string): string {
  // 使用DOMPurify或类似库清理HTML
  // 防止XSS攻击
  // 移除危险标签和属性
}

// 检查内容大小
function validateContentSize(content: string): boolean {
  const maxSize = parseInt(process.env.FEISHU_IMPORT_MAX_SIZE || '10485760');
  return Buffer.byteLength(content, 'utf8') <= maxSize;
}

// 检查敏感词
function containsSensitiveWords(content: string): boolean {
  const sensitiveWords = ['敏感词1', '敏感词2'];
  return sensitiveWords.some(word => content.includes(word));
}
```

---

## 📊 监控和日志

### 1. 导入统计

```typescript
// 记录导入事件
interface ImportLog {
  articleId: string;
  source: string;
  imageCount: number;
  processingTime: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// 记录成功导入
function logSuccessfulImport(articleId: string, source: string, imageCount: number, processingTime: number) {
  console.log(`✅ 飞书导入成功: ${articleId} | 来源: ${source} | 图片: ${imageCount} | 耗时: ${processingTime}ms`);
}

// 记录失败导入
function logFailedImport(error: string, source?: string) {
  console.error(`❌ 飞书导入失败: ${error} | 来源: ${source || 'unknown'}`);
}
```

### 2. 性能监控

```typescript
// 性能指标
interface PerformanceMetrics {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  averageProcessingTime: number;
  totalImagesProcessed: number;
}

// 更新指标
function updateMetrics(metrics: PerformanceMetrics, success: boolean, processingTime: number, imageCount: number) {
  metrics.totalImports++;

  if (success) {
    metrics.successfulImports++;
    metrics.totalImagesProcessed += imageCount;
  } else {
    metrics.failedImports++;
  }

  // 计算平均处理时间
  metrics.averageProcessingTime =
    (metrics.averageProcessingTime * (metrics.totalImports - 1) + processingTime) / metrics.totalImports;
}
```

### 3. 错误分类统计

```typescript
// 错误统计
const errorStats = {
  UNAUTHORIZED: 0,
  MISSING_CONTENT: 0,
  INVALID_FORMAT: 0,
  CONTENT_TOO_LARGE: 0,
  INTERNAL_ERROR: 0,
};

// 记录错误
function logError(errorCode: string) {
  if (errorStats.hasOwnProperty(errorCode)) {
    errorStats[errorCode]++;
  }
}

// 获取错误报告
function getErrorReport() {
  const total = Object.values(errorStats).reduce((sum, count) => sum + count, 0);
  return {
    totalErrors: total,
    errorBreakdown: errorStats,
    errorRate: total / (total + /* 成功次数 */) * 100
  };
}
```

---

## 🎯 实现总结

### 复杂度评估
- **开发难度**: ⭐⭐ (非常简单)
- **预计开发时间**: 2-3小时
- **新增代码量**: 约100行
- **主要工作**: 复用现有逻辑

### 技术优势
- ✅ **复用现有**: 90%逻辑已存在
- ✅ **格式完整**: HTML保持原有排版
- ✅ **图片自动**: 复用现有图片处理
- ✅ **插件集成**: 无缝衔接现有工作流

### 业务价值
- 🚀 **效率提升**: 自动化内容导入
- 🎯 **用户体验**: 无需手动复制粘贴
- 🔗 **生态完善**: 支持多种外部系统集成
- 📈 **扩展性强**: 便于未来功能扩展

### 适用场景
1. **飞书机器人**: 自动同步文档更新
2. **Zapier/IFTTT**: 连接各种Web服务
3. **内部系统**: 企业知识库自动发布
4. **第三方工具**: 内容管理系统集成

---

**🎉 总结：这个方案提供了一个简洁、实用、高效的HTTP API接口，让外部系统可以轻松地将内容导入到Ziliu系统中，实现完整的自动化内容发布流水线。**