import { NextRequest, NextResponse } from 'next/server';
import TurndownService from 'turndown';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkImageQuota, uploadImageFromUrl } from '@/lib/services/image-service';


/**
 * 统计HTML中的图片数量（需要上传的）
 */
function countImagesInHtml(html: string): number {
  const imgRegex = /<img[^>]*>/g;
  const imgTags = Array.from(html.matchAll(imgRegex));
  
  let count = 0;
  for (const imgMatch of imgTags) {
    const fullImgTag = imgMatch[0];
    const srcMatch = fullImgTag.match(/src="([^"]+)"/);
    if (!srcMatch) continue;
    
    const originalSrc = srcMatch[1];
    
    // 跳过已经是base64或本地URL的图片
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('/') || 
        originalSrc.includes(process.env.R2_PUBLIC_URL || '')) {
      continue;
    }
    
    count++;
  }
  
  return count;
}


export async function POST(request: NextRequest) {
  try {
    // 检查用户认证
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 解析飞书内容，包括图片上传处理（会在内部做降级处理）
    const result = await parseFeishuContent(content, session);

    return NextResponse.json({
      success: true,
      title: result.title,
      markdown: result.markdown,
      imageWarning: result.imageWarning // 添加图片处理警告信息
    });
  } catch (error) {
    console.error('解析飞书内容失败:', error);
    return NextResponse.json(
      { success: false, error: '解析失败' },
      { status: 500 }
    );
  }
}

async function parseFeishuContent(htmlContent: string, session: any): Promise<{ 
  title: string; 
  markdown: string; 
  imageWarning?: string; 
}> {
  // 先处理图片上传，然后转换HTML到Markdown
  const imageResult = await processImagesInHtml(htmlContent, session);
  const markdown = convertHtmlToMarkdownWithTurndown(imageResult.processedHtml);

  return { 
    title: '', 
    markdown,
    imageWarning: imageResult.warning
  };
}

// 处理HTML中的图片，上传到图床并替换URL
async function processImagesInHtml(html: string, session: any): Promise<{
  processedHtml: string;
  warning?: string;
}> {
  // 检查用户图片权限
  let hasImageQuota = true;
  let quotaWarning = '';
  
  if (!session?.user?.email) {
    hasImageQuota = false;
    quotaWarning = '用户未登录，飞书图片将保留原始链接';
  } else {
    try {
      // 使用公共服务检查用户配额
      const quotaCheck = await checkImageQuota(session.user.email);
      hasImageQuota = quotaCheck.hasQuota;
      
      if (!hasImageQuota) {
        quotaWarning = quotaCheck.reason || '当月图片额度不足，飞书图片将保留原始链接';
      }
    } catch (error) {
      console.error('检查图片配额失败:', error);
      // 如果检查失败，为了用户体验，先允许尝试上传，让具体上传时再处理错误
      hasImageQuota = true;
    }
  }

  // 使用正则表达式匹配所有img标签，并提取src属性
  const imgRegex = /<img[^>]*>/g;
  let processedHtml = html;
  const imgTags = Array.from(html.matchAll(imgRegex));
  let uploadedCount = 0;
  let failedCount = 0;

  for (const imgMatch of imgTags) {
    const fullImgTag = imgMatch[0];

    // 从img标签中提取src属性
    const srcMatch = fullImgTag.match(/src="([^"]+)"/);
    if (!srcMatch) {
      continue;
    }

    const originalSrc = srcMatch[1];

    try {
      // 跳过已经是base64或本地URL的图片
      if (originalSrc.startsWith('data:') || originalSrc.startsWith('/') || originalSrc.includes(process.env.R2_PUBLIC_URL || '')) {
        continue;
      }

      // 如果没有图片额度，跳过上传，保留原图
      if (!hasImageQuota) {
        console.warn('图片额度不足，跳过上传:', originalSrc);
        failedCount++;
        continue;
      }

      // 使用公共服务上传图片
      try {
        console.log('处理图片:', originalSrc);
        const uploadResult = await uploadImageFromUrl(originalSrc, session.user.email);
        
        if (uploadResult.success && uploadResult.url) {
          processedHtml = processedHtml.replace(fullImgTag, fullImgTag.replace(originalSrc, uploadResult.url));
          console.log('图片上传成功:', originalSrc, '->', uploadResult.url);
          uploadedCount++;
        } else {
          console.warn('图片上传失败，保留原始URL:', originalSrc, uploadResult.error);
          failedCount++;
        }
      } catch (error) {
        console.error('处理图片失败:', originalSrc, error);
        failedCount++;
      }
    } catch (error) {
      console.error('处理图片失败:', originalSrc, error);
      failedCount++;
    }
  }

  // 生成警告消息
  let warning = quotaWarning;
  if (failedCount > 0 && uploadedCount > 0) {
    warning = warning || `成功上传 ${uploadedCount} 张图片，${failedCount} 张图片保留原始链接`;
  } else if (failedCount > 0) {
    warning = warning || `${failedCount} 张图片保留原始链接（额度不足或上传失败）`;
  }

  return { 
    processedHtml, 
    warning: warning || undefined 
  };
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
