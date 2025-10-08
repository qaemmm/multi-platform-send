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
        .wechat-content ul {
          list-style-type: disc;
        }
        .wechat-content ol {
          list-style-type: decimal;
        }
        .wechat-content li {
          margin: 8px 0;
        }
        /* 特殊处理：有序列表中包含标题的情况，让数字标号和标题样式保持一致 */
        .wechat-content ol > li > h3 {
          display: inline;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
        }
        .wechat-content ol > li::marker {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
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
        .wechat-content ul, .wechat-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .wechat-content ul {
          list-style-type: disc;
        }
        .wechat-content ol {
          list-style-type: decimal;
        }
        .wechat-content li {
          margin: 8px 0;
        }
        /* 特殊处理：有序列表中包含标题的情况，让数字标号和标题样式保持一致 */
        .wechat-content ol > li > h3 {
          display: inline;
          margin: 0;
          font-size: 18px;
          color: #764ba2;
          font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
        }
        .wechat-content ol > li::marker {
          font-size: 18px;
          color: #764ba2;
          font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", monospace;
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
        .wechat-content ul, .wechat-content ol {
          margin: 20px 0;
          padding-left: 24px;
        }
        .wechat-content ul {
          list-style-type: disc;
        }
        .wechat-content ol {
          list-style-type: decimal;
        }
        .wechat-content li {
          margin: 8px 0;
          line-height: 1.8;
        }
        /* 特殊处理：有序列表中包含标题的情况，让数字标号和标题样式保持一致 */
        .wechat-content ol > li > h3 {
          display: inline;
          margin: 0;
          font-size: 18px;
          font-weight: 400;
          color: #2c3e50;
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
        }
        .wechat-content ol > li::marker {
          font-size: 18px;
          font-weight: 400;
          color: #2c3e50;
          font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
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
  },
  warm: {
    name: '温暖橙色',
    css: `
      <style>
        .wechat-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          line-height: 1.8;
          color: #3d3d3d;
          max-width: 100%;
          word-wrap: break-word;
        }
        .wechat-content h1 {
          color: #fff;
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%);
          padding: 16px 20px;
          border-radius: 12px;
          margin: 24px 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
        }
        .wechat-content h2 {
          color: #ff6b35;
          border-bottom: 3px solid #ff9a56;
          padding-bottom: 8px;
          margin: 20px 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          position: relative;
        }
        .wechat-content h2::before {
          content: "◆";
          color: #ff9a56;
          margin-right: 8px;
          font-size: 16px;
        }
        .wechat-content h3 {
          color: #ff6b35;
          margin: 16px 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .wechat-content h3::before {
          content: "▸";
          color: #ff9a56;
          margin-right: 6px;
        }
        .wechat-content p {
          margin: 16px 0;
          text-align: justify;
          font-size: 16px;
          color: #4a4a4a;
          line-height: 1.9;
        }
        .wechat-content strong {
          color: #ff6b35;
          font-weight: 600;
        }
        .wechat-content code {
          background: #fff5f0;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          color: #ff6b35;
          font-size: 14px;
          border: 1px solid #ffe5d9;
        }
        .wechat-content pre {
          background: #fff5f0;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
          border-left: 4px solid #ff9a56;
          box-shadow: 0 2px 8px rgba(255, 154, 86, 0.1);
        }
        .wechat-content pre code {
          background: none;
          padding: 0;
          color: #3d3d3d;
          border: none;
        }
        .wechat-content blockquote {
          border-left: 4px solid #ff9a56;
          padding-left: 16px;
          margin: 16px 0;
          color: #666;
          background: #fff8f5;
          padding: 14px 16px;
          border-radius: 6px;
          position: relative;
        }
        .wechat-content blockquote::before {
          content: """;
          position: absolute;
          left: 12px;
          top: 8px;
          font-size: 32px;
          color: #ffc4a3;
          line-height: 1;
        }
        .wechat-content ul, .wechat-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .wechat-content ul {
          list-style-type: none;
        }
        .wechat-content ul li::before {
          content: "●";
          color: #ff9a56;
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: -1em;
        }
        .wechat-content ol {
          list-style-type: none;
          counter-reset: item;
        }
        .wechat-content ol li {
          counter-increment: item;
          margin: 8px 0;
          position: relative;
        }
        .wechat-content ol li::before {
          content: counter(item);
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%);
          color: white;
          font-weight: bold;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          font-size: 13px;
        }
        .wechat-content li {
          margin: 8px 0;
          padding-left: 4px;
        }
        /* 特殊处理：有序列表中包含标题的情况 */
        .wechat-content ol > li > h3 {
          display: inline;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #ff6b35;
        }
        .wechat-content ol > li > h3::before {
          content: none;
        }
        .wechat-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .wechat-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          border-radius: 8px;
          overflow: hidden;
        }
        .wechat-content th, .wechat-content td {
          border: 1px solid #ffe5d9;
          padding: 10px 12px;
          text-align: left;
        }
        .wechat-content th {
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%);
          color: white;
          font-weight: 600;
        }
        .wechat-content tr:nth-child(even) {
          background: #fff8f5;
        }
        .wechat-content a {
          color: #ff6b35;
          text-decoration: none;
          border-bottom: 1px solid #ff9a56;
          transition: all 0.3s;
        }
        .wechat-content a:hover {
          color: #ff9a56;
          border-bottom-color: #ff6b35;
        }
      </style>
    `
  },
  fresh: {
    name: '清新绿色',
    css: `
      <style>
        .wechat-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          line-height: 1.8;
          color: #2d3436;
          max-width: 100%;
          word-wrap: break-word;
        }
        .wechat-content h1 {
          color: #fff;
          background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
          padding: 16px 20px;
          border-radius: 12px;
          margin: 24px 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 184, 148, 0.2);
        }
        .wechat-content h2 {
          color: #00b894;
          border-bottom: 3px solid #00cec9;
          padding-bottom: 8px;
          margin: 20px 0 12px 0;
          font-size: 20px;
          font-weight: 600;
          position: relative;
        }
        .wechat-content h2::before {
          content: "🌿";
          margin-right: 8px;
          font-size: 18px;
        }
        .wechat-content h3 {
          color: #00b894;
          margin: 16px 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }
        .wechat-content h3::before {
          content: "🍃";
          margin-right: 6px;
          font-size: 14px;
        }
        .wechat-content p {
          margin: 16px 0;
          text-align: justify;
          font-size: 16px;
          color: #4a4a4a;
          line-height: 1.9;
        }
        .wechat-content strong {
          color: #00b894;
          font-weight: 600;
        }
        .wechat-content code {
          background: #f0fdf9;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          color: #00b894;
          font-size: 14px;
          border: 1px solid #d4f4e8;
        }
        .wechat-content pre {
          background: #f0fdf9;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
          border-left: 4px solid #00cec9;
          box-shadow: 0 2px 8px rgba(0, 206, 201, 0.1);
        }
        .wechat-content pre code {
          background: none;
          padding: 0;
          color: #2d3436;
          border: none;
        }
        .wechat-content blockquote {
          border-left: 4px solid #00cec9;
          padding-left: 16px;
          margin: 16px 0;
          color: #636e72;
          background: #f5fffe;
          padding: 14px 16px;
          border-radius: 6px;
          position: relative;
        }
        .wechat-content blockquote::before {
          content: "💭";
          position: absolute;
          left: 12px;
          top: 10px;
          font-size: 20px;
          line-height: 1;
        }
        .wechat-content ul, .wechat-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .wechat-content ul {
          list-style-type: none;
        }
        .wechat-content ul li::before {
          content: "✓";
          color: #00b894;
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: -1em;
          font-size: 16px;
        }
        .wechat-content ol {
          list-style-type: none;
          counter-reset: item;
        }
        .wechat-content ol li {
          counter-increment: item;
          margin: 8px 0;
          position: relative;
        }
        .wechat-content ol li::before {
          content: counter(item);
          background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
          color: white;
          font-weight: bold;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
          font-size: 13px;
        }
        .wechat-content li {
          margin: 8px 0;
          padding-left: 4px;
        }
        /* 特殊处理：有序列表中包含标题的情况 */
        .wechat-content ol > li > h3 {
          display: inline;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #00b894;
        }
        .wechat-content ol > li > h3::before {
          content: none;
        }
        .wechat-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px auto;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .wechat-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          border-radius: 8px;
          overflow: hidden;
        }
        .wechat-content th, .wechat-content td {
          border: 1px solid #d4f4e8;
          padding: 10px 12px;
          text-align: left;
        }
        .wechat-content th {
          background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
          color: white;
          font-weight: 600;
        }
        .wechat-content tr:nth-child(even) {
          background: #f5fffe;
        }
        .wechat-content a {
          color: #00b894;
          text-decoration: none;
          border-bottom: 1px solid #00cec9;
          transition: all 0.3s;
        }
        .wechat-content a:hover {
          color: #00cec9;
          border-bottom-color: #00b894;
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

  const html = marked(markdown) as string;
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

// 生成带内联样式的HTML（用于公众号编辑器）
export function convertToWechatInline(
  markdown: string,
  styleKey: keyof typeof WECHAT_STYLES = 'default'
): string {
  // 配置marked选项
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const html = marked(markdown) as string;

  // 预处理HTML，解决格式问题
  const cleanedHtml = preprocessHtmlForWechat(html);

  // 根据样式生成内联样式映射
  const inlineStyles = getInlineStylesForWechat(styleKey);

  // 解析HTML并添加内联样式
  return applyInlineStyles(cleanedHtml, inlineStyles);
}

// 预处理HTML，解决微信公众号编辑器的格式问题
function preprocessHtmlForWechat(html: string): string {
  let processedHtml = html;

  // 1. 清理多余的空格和换行
  processedHtml = processedHtml
    // 移除连续的空格（保留单个空格）
    .replace(/\s{3,}/g, ' ')
    // 清理标签间多余的空白
    .replace(/>\s+</g, '><')
    // 清理段落间多余的换行
    .replace(/(<\/p>)\s*(<p[^>]*>)/g, '$1$2')
    // 清理标题间多余的换行
    .replace(/(<\/h[1-6]>)\s*(<[^>]+>)/g, '$1$2');

  // 2. 修复代码块格式，确保换行保持
  processedHtml = processedHtml.replace(
    /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (match, codeContent) => {
      // 保护代码块中的换行符和空格
      const protectedCode = codeContent
        // 将换行符转换为<br>标签
        .replace(/\n/g, '<br>')
        // 将多个空格转换为&nbsp;
        .replace(/  /g, '&nbsp;&nbsp;')
        // 保护制表符
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

      return `<pre><code>${protectedCode}</code></pre>`;
    }
  );

  // 2.5 兼容微信公众号：将 h1/h2/h3 转为等价的 p + span 内联样式，避免 h 标签被剥离
  // 分离容器样式和文本样式，避免重复应用边框
  const h1ContainerStyle = 'margin: 24px 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';
  const h1TextStyle = 'font-size: 24px; font-weight: 600; color: #2c3e50; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';

  const h2ContainerStyle = 'margin: 20px 0 12px 0; border-left: 4px solid #3498db; padding-left: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';
  const h2TextStyle = 'font-size: 20px; font-weight: 600; color: #34495e; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';

  const h3ContainerStyle = 'margin: 16px 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';
  const h3TextStyle = 'font-size: 18px; font-weight: 600; color: #2c3e50; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';

  processedHtml = processedHtml
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, text) => `<p style="${h1ContainerStyle}"><span style="${h1TextStyle}">${text}</span></p>`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, text) => `<p style="${h2ContainerStyle}"><span style="${h2TextStyle}">${text}</span></p>`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, text) => `<p style="${h3ContainerStyle}"><span style="${h3TextStyle}">${text}</span></p>`);

  // 3. 修复行内代码的空格问题
  processedHtml = processedHtml.replace(
    /<code>([^<]+)<\/code>/g,
    (match, codeContent) => {
      // 保护行内代码中的空格
      const protectedCode = codeContent.replace(/  /g, '&nbsp;&nbsp;');
      return `<code>${protectedCode}</code>`;
    }
  );

  // 4. 优化列表格式
  processedHtml = processedHtml
    // 确保列表项之间有适当的间距
    .replace(/(<\/li>)\s*(<li>)/g, '$1$2')
    // 清理列表前后的多余空白
    .replace(/(<\/[uo]l>)\s*(<[^>]+>)/g, '$1$2');

  // 5. 移除可能导致问题的section标签
  processedHtml = processedHtml
    .replace(/<section[^>]*>/g, '<div>')
    .replace(/<\/section>/g, '</div>');

  // 6. 将 <hr> 转换为安全的分割线容器
  processedHtml = processedHtml.replace(/<hr\s*\/?>/gi, '<div style="margin: 24px 0; border-top: 1px solid #e5e7eb;"></div>');

  return processedHtml;
}

// 获取内联样式映射 - 优化微信编辑器兼容性
function getInlineStylesForWechat(styleKey: keyof typeof WECHAT_STYLES) {
  // 微信编辑器兼容的字体栈
  const wechatFontFamily = 'mp-quote, -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif';
  const wechatCodeFontFamily = '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const baseStyles = {
    default: {
      h1: `color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin: 24px 0 16px 0; font-size: 24px; font-weight: 600; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      h2: `color: #34495e; border-left: 4px solid #3498db; padding-left: 12px; margin: 20px 0 12px 0; font-size: 20px; font-weight: 600; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      h3: `color: #2c3e50; margin: 16px 0 8px 0; font-size: 18px; font-weight: 600; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      p: `margin: 16px 0; text-align: justify; font-size: 16px; line-height: 1.8; color: #333333; font-family: ${wechatFontFamily}; word-wrap: break-word; word-break: break-all;`,
      code: `background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: ${wechatCodeFontFamily}; color: #e74c3c; font-size: 14px; white-space: pre-wrap; display: inline;`,
      pre: `background-color: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; border-left: 4px solid #3498db; font-family: ${wechatCodeFontFamily}; white-space: pre-wrap; display: block;`,
      blockquote: `border-left: 4px solid #bdc3c7; padding: 12px 16px; margin: 16px 0; color: #7f8c8d; font-style: italic; background-color: #f9f9f9; border-radius: 4px; display: block;`,
      ul: `margin: 16px 0; padding-left: 24px; list-style-type: disc; font-family: ${wechatFontFamily};`,
      ol: `margin: 16px 0; padding-left: 24px; list-style-type: decimal; font-family: ${wechatFontFamily};`,
      li: `margin: 8px 0; line-height: 1.6; font-family: ${wechatFontFamily};`,
      strong: `font-weight: 600; color: #2c3e50; font-family: ${wechatFontFamily};`,
      em: `font-style: italic; color: #34495e; font-family: ${wechatFontFamily};`
    },
    tech: {
      h1: `background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 8px; margin: 24px 0 16px 0; font-size: 24px; line-height: 1.4; font-family: ${wechatCodeFontFamily}; display: block;`,
      h2: `color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin: 20px 0 12px 0; font-size: 20px; line-height: 1.4; font-family: ${wechatCodeFontFamily}; display: block;`,
      h3: `color: #764ba2; margin: 16px 0 8px 0; font-size: 18px; line-height: 1.4; font-family: ${wechatCodeFontFamily}; display: block;`,
      p: `margin: 16px 0; font-size: 16px; line-height: 1.8; color: #2c3e50; font-family: ${wechatCodeFontFamily}; word-wrap: break-word; word-break: break-all;`,
      code: `background-color: #282c34; color: #abb2bf; padding: 2px 6px; border-radius: 4px; font-size: 14px; font-family: ${wechatCodeFontFamily}; white-space: pre-wrap; display: inline;`,
      pre: `background-color: #282c34; color: #abb2bf; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-family: ${wechatCodeFontFamily}; white-space: pre-wrap; display: block;`,
      blockquote: `border-left: 4px solid #667eea; padding: 12px 16px; margin: 16px 0; color: #7f8c8d; background-color: #f8f9ff; border-radius: 4px; display: block;`,
      ul: `margin: 16px 0; padding-left: 24px; list-style-type: disc; font-family: ${wechatCodeFontFamily};`,
      ol: `margin: 16px 0; padding-left: 24px; list-style-type: decimal; font-family: ${wechatCodeFontFamily};`,
      li: `margin: 8px 0; line-height: 1.6; font-family: ${wechatCodeFontFamily};`,
      strong: `font-weight: 600; color: #667eea; font-family: ${wechatCodeFontFamily};`,
      em: `font-style: italic; color: #764ba2; font-family: ${wechatCodeFontFamily};`
    },
    minimal: {
      h1: `font-weight: 300; color: #2c3e50; margin: 32px 0 16px 0; font-size: 28px; text-align: center; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      h2: `font-weight: 400; color: #34495e; margin: 24px 0 12px 0; font-size: 22px; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      h3: `font-weight: 400; color: #2c3e50; margin: 20px 0 8px 0; font-size: 18px; line-height: 1.4; font-family: ${wechatFontFamily}; display: block;`,
      p: `color: #555555; margin: 20px 0; font-size: 16px; text-align: justify; line-height: 2; font-family: ${wechatFontFamily}; word-wrap: break-word; word-break: break-all;`,
      code: `background-color: #f5f5f5; padding: 2px 4px; border-radius: 2px; font-size: 14px; color: #666666; font-family: ${wechatCodeFontFamily}; white-space: pre-wrap; display: inline;`,
      pre: `background-color: #fafafa; padding: 20px; border-radius: 4px; margin: 20px 0; border: 1px solid #eeeeee; font-family: ${wechatCodeFontFamily}; white-space: pre-wrap; display: block;`,
      blockquote: `border-left: 2px solid #dddddd; padding-left: 20px; margin: 20px 0; color: #666666; font-style: normal; display: block;`,
      ul: `margin: 20px 0; padding-left: 24px; list-style-type: disc; font-family: ${wechatFontFamily};`,
      ol: `margin: 20px 0; padding-left: 24px; list-style-type: decimal; font-family: ${wechatFontFamily};`,
      li: `margin: 8px 0; line-height: 1.8; font-family: ${wechatFontFamily};`,
      strong: `font-weight: 600; color: #2c3e50; font-family: ${wechatFontFamily};`,
      em: `font-style: italic; color: #555555; font-family: ${wechatFontFamily};`
    }
  };

  return baseStyles[styleKey];
}

// 应用内联样式到HTML - 优化微信编辑器兼容性
function applyInlineStyles(html: string, styles: Record<string, string>): string {
  let styledHtml = html;

  // 处理各种HTML标签
  Object.entries(styles).forEach(([tag, style]) => {
    const regex = new RegExp(`<${tag}([^>]*)>`, 'gi');
    styledHtml = styledHtml.replace(regex, (match, attributes) => {
      // 清理和规范化样式
      const cleanStyle = style.replace(/\s+/g, ' ').trim();

      // 如果已有style属性，合并样式
      if (attributes && attributes.includes('style=')) {
        return match.replace(/style="([^"]*)"/, (_, existingStyle) => {
          // 合并样式，新样式优先
          const mergedStyle = `${existingStyle.trim()}; ${cleanStyle}`.replace(/;\s*;/g, ';');
          return `style="${mergedStyle}"`;
        });
      } else {
        // 添加新的style属性
        const cleanAttributes = attributes || '';
        return `<${tag}${cleanAttributes} style="${cleanStyle}">`;
      }
    });
  });

  // 特殊处理pre中的code标签，确保代码块样式正确
  styledHtml = styledHtml.replace(
    /<pre([^>]*)><code([^>]*)>/gi,
    (_, preAttrs, codeAttrs) => {
      // 为pre中的code标签添加特殊样式，确保换行和空格保持
      const codeStyle = 'background-color: transparent; padding: 0; color: inherit; white-space: pre-wrap; font-family: inherit; display: inline;';

      if (codeAttrs && codeAttrs.includes('style=')) {
        const updatedCodeAttrs = codeAttrs.replace(/style="([^"]*)"/, `style="$1; ${codeStyle}"`);
        return `<pre${preAttrs}><code${updatedCodeAttrs}>`;
      } else {
        return `<pre${preAttrs}><code${codeAttrs} style="${codeStyle}">`;
      }
    }
  );

  // 添加微信编辑器需要的属性
  styledHtml = styledHtml.replace(/<p([^>]*style="[^"]*")([^>]*)>/gi, (match) => {
    if (!match.includes('data-tools=')) {
      return match.replace('>', ' data-tools="135editor">');
    }
    return match;
  });

  // 确保图片有正确的样式
  styledHtml = styledHtml.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('style=')) {
      return `<img${attrs} style="max-width: 100%; height: auto; display: block; margin: 16px auto;">`;
    }
    return match;
  });

  return styledHtml;
}

// 预览转换结果
export function previewConversion(markdown: string, styleKey: keyof typeof WECHAT_STYLES = 'default') {
  const html = convertToWechat(markdown, styleKey);
  const inlineHtml = convertToWechatInline(markdown, styleKey);
  const wordCount = markdown.replace(/\s/g, '').length;
  const readingTime = Math.ceil(wordCount / 300); // 假设每分钟阅读300字

  return {
    html, // 用于预览的HTML（带CSS类）
    inlineHtml, // 用于公众号编辑器的HTML（内联样式）
    wordCount,
    readingTime,
    style: WECHAT_STYLES[styleKey].name,
  };
}
