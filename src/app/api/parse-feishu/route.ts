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

    console.log('🔍 飞书导入API调用 - 用户邮箱:', session.user?.email);

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 解析飞书内容，使用本地存储方案
    const result = await parseFeishuContent(content, session);

    return NextResponse.json({
      success: true,
      title: result.title,
      markdown: result.markdown,
      imageWarning: result.imageWarning, // 添加图片处理警告信息
      imageCount: result.imageCount, // 添加图片数量信息
      processedImages: result.processedImages // 添加已处理图片数量
    });
  } catch (error) {
    console.error('解析飞书内容失败:', error);
    return NextResponse.json(
      { success: false, error: '解析失败，请重试' },
      { status: 500 }
    );
  }
}

async function parseFeishuContent(htmlContent: string, session: any): Promise<{ 
  title: string; 
  markdown: string; 
  imageWarning?: string; 
  imageCount?: number;
  processedImages?: number;
}> {
  // 先处理图片上传，然后转换HTML到Markdown
  const imageResult = await processImagesInHtml(htmlContent, session);
  const markdown = convertHtmlToMarkdownWithTurndown(imageResult.processedHtml);

  return { 
    title: '', 
    markdown,
    imageWarning: imageResult.warning,
    imageCount: imageResult.totalImages,
    processedImages: imageResult.processedImages
  };
}

// 处理HTML中的图片，上传到云存储
async function processImagesInHtml(html: string, session: any): Promise<{
  processedHtml: string;
  warning?: string;
  totalImages?: number;
  processedImages?: number;
}> {
  // 检查图片配额
  const quotaCheck = await checkImageQuota(session.user.email);
  let hasImageQuota = quotaCheck.hasQuota;
  let quotaWarning = quotaCheck.warning || '';

  // 使用正则表达式匹配所有img标签，并提取src属性
  const imgRegex = /<img[^>]*>/g;
  let processedHtml = html;
  const imgTags = Array.from(html.matchAll(imgRegex));

  // 如果没有图片需要处理，直接返回
  if (imgTags.length === 0) {
    return {
      processedHtml,
      warning: quotaWarning || undefined,
      totalImages: 0,
      processedImages: 0
    };
  }

  // 收集所有需要处理的图片信息
  const imagesToProcess: Array<{
    fullImgTag: string;
    originalSrc: string;
    index: number;
  }> = [];

  imgTags.forEach((imgMatch, index) => {
    const fullImgTag = imgMatch[0];
    const srcMatch = fullImgTag.match(/src="([^"]+)"/);
    if (!srcMatch) return;

    const originalSrc = srcMatch[1];

    // 跳过已经是base64或本地URL的图片
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('/') ||
        originalSrc.includes(process.env.R2_PUBLIC_URL || '') ||
        originalSrc.includes(process.env.QINIU_DOMAIN || '')) {
      return;
    }

    imagesToProcess.push({ fullImgTag, originalSrc, index });
  });

  // 如果没有需要处理的图片，直接返回
  if (imagesToProcess.length === 0) {
    return {
      processedHtml,
      warning: quotaWarning || undefined,
      totalImages: imgTags.length,
      processedImages: 0
    };
  }

  let convertedCount = 0;
  let failedCount = 0;

  console.log(`🚀 开始处理 ${imagesToProcess.length} 张图片，上传到云存储`);

  // 逐个处理图片
  for (const imageInfo of imagesToProcess) {
    // 检查是否还有配额
    if (!hasImageQuota) {
      console.warn('⚠️ 图片配额已用完，剩余图片保留原始链接');
      failedCount += imagesToProcess.length - convertedCount;
      break;
    }

    try {
      console.log('📤 上传图片到云存储:', imageInfo.originalSrc);

      const uploadResult = await uploadImageFromUrl(
        imageInfo.originalSrc,
        session.user.email
      );

      if (uploadResult.success && uploadResult.url) {
        processedHtml = processedHtml.replace(
          imageInfo.fullImgTag,
          imageInfo.fullImgTag.replace(imageInfo.originalSrc, uploadResult.url)
        );
        console.log('✅ 图片上传成功:', imageInfo.originalSrc, '→', uploadResult.url);
        convertedCount++;
      } else {
        console.warn('⚠️ 图片上传失败，保留原始URL:', imageInfo.originalSrc, uploadResult.error);
        failedCount++;

        // 如果是配额问题，停止后续上传
        if (uploadResult.error?.includes('配额') || uploadResult.error?.includes('限制')) {
          hasImageQuota = false;
          quotaWarning = uploadResult.error;
        }
      }
    } catch (error) {
      console.error('❌ 处理图片失败:', imageInfo.originalSrc, error);
      failedCount++;
    }
  }

  // 生成警告消息
  let warning = quotaWarning;
  if (failedCount > 0 && convertedCount > 0) {
    warning = warning || `成功上传 ${convertedCount} 张图片，${failedCount} 张图片保留原始链接`;
  } else if (failedCount > 0) {
    warning = warning || `${failedCount} 张图片保留原始链接（上传失败）`;
  } else if (convertedCount > 0) {
    warning = warning || `成功上传 ${convertedCount} 张图片到云存储`;
  }

  return {
    processedHtml,
    warning: warning || undefined,
    totalImages: imagesToProcess.length,
    processedImages: convertedCount
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
