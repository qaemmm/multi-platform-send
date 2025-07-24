import { marked } from 'marked';

// 公众号样式模板
export const WECHAT_STYLES = {
  default: {
    name: '默认样式',
    css: `
      <style>
        .wechat-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.8;
          color: #333;
          max-width: 100%;
          word-wrap: break-word;
        }
        .wechat-content h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 8px;
          margin: 24px 0 16px 0;
          font-size: 24px;
          font-weight: 600;
        }
        .wechat-content h2 {
          color: #34495e;
          border-left: 4px solid #3498db;
          padding-left: 12px;
          margin: 20px 0 12px 0;
          font-size: 20px;
          font-weight: 600;
        }
        .wechat-content h3 {
          color: #2c3e50;
          margin: 16px 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .wechat-content p {
          margin: 16px 0;
          text-align: justify;
          font-size: 16px;
        }
        .wechat-content code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          color: #e74c3c;
          font-size: 14px;
        }
        .wechat-content pre {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
          border-left: 4px solid #3498db;
        }
        .wechat-content pre code {
          background: none;
          padding: 0;
          color: #2c3e50;
        }
        .wechat-content blockquote {
          border-left: 4px solid #bdc3c7;
          padding-left: 16px;
          margin: 16px 0;
          color: #7f8c8d;
          font-style: italic;
          background: #f9f9f9;
          padding: 12px 16px;
          border-radius: 4px;
        }
        .wechat-content ul, .wechat-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .wechat-content li {
          margin: 8px 0;
        }
        .wechat-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
          border-radius: 4px;
        }
        .wechat-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .wechat-content th, .wechat-content td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        .wechat-content th {
          background: #f8f9fa;
          font-weight: 600;
        }
      </style>
    `
  },
  tech: {
    name: '技术风格',
    css: `
      <style>
        .wechat-content {
          font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
          line-height: 1.8;
          color: #2c3e50;
          max-width: 100%;
        }
        .wechat-content h1 {
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 24px 0 16px 0;
          font-size: 24px;
        }
        .wechat-content h2 {
          color: #667eea;
          border-bottom: 2px solid #667eea;
          padding-bottom: 8px;
          margin: 20px 0 12px 0;
          font-size: 20px;
        }
        .wechat-content h3 {
          color: #764ba2;
          margin: 16px 0 8px 0;
          font-size: 18px;
        }
        .wechat-content p {
          margin: 16px 0;
          font-size: 16px;
        }
        .wechat-content code {
          background: #282c34;
          color: #abb2bf;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 14px;
        }
        .wechat-content pre {
          background: #282c34;
          color: #abb2bf;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .wechat-content pre code {
          background: none;
          color: #abb2bf;
        }
        .wechat-content blockquote {
          border-left: 4px solid #667eea;
          padding-left: 16px;
          margin: 16px 0;
          color: #7f8c8d;
          background: #f8f9ff;
          padding: 12px 16px;
          border-radius: 4px;
        }
      </style>
    `
  },
  minimal: {
    name: '简约风格',
    css: `
      <style>
        .wechat-content {
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          line-height: 2;
          color: #333;
          max-width: 100%;
        }
        .wechat-content h1 {
          font-weight: 300;
          color: #2c3e50;
          margin: 32px 0 16px 0;
          font-size: 28px;
          text-align: center;
        }
        .wechat-content h2 {
          font-weight: 400;
          color: #34495e;
          margin: 24px 0 12px 0;
          font-size: 22px;
        }
        .wechat-content h3 {
          font-weight: 400;
          color: #2c3e50;
          margin: 20px 0 8px 0;
          font-size: 18px;
        }
        .wechat-content p {
          color: #555;
          margin: 20px 0;
          font-size: 16px;
          text-align: justify;
        }
        .wechat-content code {
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 14px;
          color: #666;
        }
        .wechat-content pre {
          background: #fafafa;
          padding: 20px;
          border-radius: 4px;
          margin: 20px 0;
          border: 1px solid #eee;
        }
        .wechat-content blockquote {
          border-left: 2px solid #ddd;
          padding-left: 20px;
          margin: 20px 0;
          color: #666;
          font-style: normal;
        }
      </style>
    `
  }
};

// 转换Markdown到公众号HTML
export function convertToWechat(
  markdown: string, 
  styleKey: keyof typeof WECHAT_STYLES = 'default'
): string {
  // 配置marked选项
  marked.setOptions({
    breaks: true, // 支持换行
    gfm: true,    // 支持GitHub风格Markdown
  });

  const html = marked(markdown);
  const style = WECHAT_STYLES[styleKey];
  
  return `
    ${style.css}
    <div class="wechat-content">
      ${html}
    </div>
  `;
}

// 获取所有可用样式
export function getAvailableStyles() {
  return Object.entries(WECHAT_STYLES).map(([key, style]) => ({
    key,
    name: style.name,
  }));
}

// 预览转换结果
export function previewConversion(markdown: string, styleKey: keyof typeof WECHAT_STYLES = 'default') {
  const html = convertToWechat(markdown, styleKey);
  const wordCount = markdown.replace(/\s/g, '').length;
  const readingTime = Math.ceil(wordCount / 300); // 假设每分钟阅读300字
  
  return {
    html,
    wordCount,
    readingTime,
    style: WECHAT_STYLES[styleKey].name,
  };
}
