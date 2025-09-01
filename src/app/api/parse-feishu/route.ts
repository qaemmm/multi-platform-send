import { NextRequest, NextResponse } from 'next/server';
import TurndownService from 'turndown';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// 配置 Cloudflare R2 客户端
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  tls: true,
});

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
  // 检查环境变量
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    console.warn('R2 配置缺失，跳过图片上传处理');
    return { processedHtml: html };
  }

  // 检查用户图片权限
  let hasImageQuota = true;
  let quotaWarning = '';
  
  try {
    // 调用统一的上传API来检查权限（只是检查，不真正上传）
    const testResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/usage/images`);
    const testData = await testResponse.json();
    
    if (testData.success) {
      // 这里可以根据配额判断是否还能上传，但暂时简化为都允许尝试
      hasImageQuota = true;
    } else {
      hasImageQuota = false;
      quotaWarning = '当月图片额度不足，飞书图片将保留原始链接';
    }
  } catch (error) {
    // 如果检查失败，降级为保留原图
    hasImageQuota = false;
    quotaWarning = '无法检查图片额度，飞书图片将保留原始链接';
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

      const isFeiShuImage = originalSrc.includes('feishu.cn') || originalSrc.includes('larksuite.com');

      if (isFeiShuImage) {
        // 对于飞书图片，尝试上传，失败则降级
        console.log('处理飞书图片:', originalSrc);

        try {
          // 直接调用现有的upload API
          const uploadResponse = await uploadViaAPI(originalSrc, session);
          if (uploadResponse?.url) {
            processedHtml = processedHtml.replace(fullImgTag, fullImgTag.replace(originalSrc, uploadResponse.url));
            console.log('飞书图片上传成功:', originalSrc, '->', uploadResponse.url);
            uploadedCount++;
          } else {
            console.warn('飞书图片上传失败，保留原始URL:', originalSrc);
            failedCount++;
          }
        } catch (error) {
          console.warn('飞书图片处理失败，保留原始URL:', originalSrc, error);
          failedCount++;
        }
      } else {
        // 处理非飞书图片
        try {
          const uploadResponse = await uploadViaAPI(originalSrc, session);
          if (uploadResponse?.url) {
            processedHtml = processedHtml.replace(fullImgTag, fullImgTag.replace(originalSrc, uploadResponse.url));
            console.log('图片上传成功:', originalSrc, '->', uploadResponse.url);
            uploadedCount++;
          } else {
            console.warn('图片上传失败:', originalSrc);
            failedCount++;
          }
        } catch (error) {
          console.error('处理图片失败:', originalSrc, error);
          failedCount++;
        }
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

/**
 * 通过统一的上传API上传图片（复用现有逻辑）
 */
async function uploadViaAPI(imageUrl: string, session: any): Promise<{ url: string } | null> {
  try {
    // 下载图片
    const imageBlob = await downloadImage(imageUrl);
    if (!imageBlob) {
      return null;
    }

    // 创建FormData并调用现有的上传API
    const formData = new FormData();
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    formData.append('file', imageBlob, filename);

    // 调用现有的上传API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/upload`, {
      method: 'POST',
      headers: {
        'Cookie': `next-auth.session-token=${session.sessionToken || ''}` // 传递session
      },
      body: formData,
    });

    const result = await response.json();
    
    if (result.success && result.data?.url) {
      return { url: result.data.url };
    }

    return null;
  } catch (error) {
    console.error('通过API上传图片失败:', error);
    return null;
  }
}

// 下载图片
async function downloadImage(url: string): Promise<Blob | null> {
  try {
    // 确保URL是完整的
    let fullUrl = url;
    if (url.startsWith('//')) {
      fullUrl = 'https:' + url;
    } else if (!url.startsWith('http')) {
      fullUrl = 'https://' + url;
    }

    // 为飞书图片添加特殊处理
    const isFeiShuImage = fullUrl.includes('feishu.cn') || fullUrl.includes('larksuite.com');

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    // 如果是飞书图片，添加更多头信息
    if (isFeiShuImage) {
      headers['Referer'] = 'https://feishu.cn/';
      headers['Origin'] = 'https://feishu.cn';
      headers['Sec-Fetch-Dest'] = 'image';
      headers['Sec-Fetch-Mode'] = 'no-cors';
      headers['Sec-Fetch-Site'] = 'same-site';
    }

    const response = await fetch(fullUrl, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('不是有效的图片类型');
    }

    return await response.blob();
  } catch (error) {
    console.error('下载图片失败:', url, error);
    return null;
  }
}


// 获取文件扩展名
function getFileExtension(mimeType: string, fileName: string): string {
  // 首先尝试从MIME类型获取
  const mimeToExt: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };

  if (mimeToExt[mimeType]) {
    return mimeToExt[mimeType];
  }

  // 从文件名获取扩展名
  const parts = fileName.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }

  // 默认返回jpg
  return 'jpg';
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
