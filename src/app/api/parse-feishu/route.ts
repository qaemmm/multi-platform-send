import { NextRequest, NextResponse } from 'next/server';
import TurndownService from 'turndown';

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 解析飞书内容
    const result = parseFeishuContent(content);

    return NextResponse.json({
      success: true,
      title: result.title,
      markdown: result.markdown,
    });
  } catch (error) {
    console.error('解析飞书内容失败:', error);
    return NextResponse.json(
      { success: false, error: '解析失败' },
      { status: 500 }
    );
  }
}

function parseFeishuContent(htmlContent: string): { title: string; markdown: string } {
  // 只使用 turndown 转换HTML到Markdown，不做任何其他处理
  const markdown = convertHtmlToMarkdownWithTurndown(htmlContent);

  return { title: '', markdown };
}






// 使用 turndown 库的转换函数，针对飞书特殊结构进行优化
function convertHtmlToMarkdownWithTurndown(html: string): string {
  // 创建 turndown 实例，使用默认配置
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full'
  });

  // 针对飞书特殊结构的预处理
  let cleanHtml = html;

  // 处理飞书特有的 white-space:pre 结构
  // 这种结构通常包含用换行符分隔的多行内容，需要转换为正确的HTML结构
  cleanHtml = cleanHtml.replace(
    /<div[^>]*style="white-space:pre;"[^>]*>([\s\S]*?)<\/div>/g,
    (_match, content: string) => {
      // 将换行符转换为段落标签
      const lines = content.split('\n').filter((line: string) => line.trim());
      return lines.map((line: string) => `<p>${line.trim()}</p>`).join('');
    }
  );

  // 处理飞书特有的包含 white-space:pre 样式的div结构（可能样式属性顺序不同）
  cleanHtml = cleanHtml.replace(
    /<div[^>]*white-space:\s*pre[^>]*>([\s\S]*?)<\/div>/g,
    (_match, content: string) => {
      // 将换行符转换为段落标签
      const lines = content.split('\n').filter((line: string) => line.trim());
      return lines.map((line: string) => `<p>${line.trim()}</p>`).join('');
    }
  );

  // 清理飞书特有的属性
  cleanHtml = cleanHtml
    .replace(/data-[^=]*="[^"]*"/g, '') // 移除data-*属性
    .replace(/style="[^"]*"/g, '') // 移除style属性
    .replace(/class="[^"]*"/g, '') // 移除class属性
    .replace(/id="[^"]*"/g, ''); // 移除id属性

  // 直接使用 turndown 转换
  let markdown = turndownService.turndown(cleanHtml);

  // 后处理
  markdown = markdown
    .replace(/[ \t]+$/gm, '') // 移除行尾空白
    .replace(/\n{3,}/g, '\n\n') // 清理多余换行
    .replace(/^\n+/, '') // 移除开头换行
    .replace(/\n+$/, '') // 移除结尾换行
    .trim();

  return markdown;
}
