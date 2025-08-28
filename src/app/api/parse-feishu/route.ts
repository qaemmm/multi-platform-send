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

    // 解析飞书内容，包括图片上传处理
    const result = await parseFeishuContent(content, session);

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

async function parseFeishuContent(htmlContent: string, session: any): Promise<{ title: string; markdown: string }> {
  // 先处理图片上传，然后转换HTML到Markdown
  const processedHtml = await processImagesInHtml(htmlContent, session);
  const markdown = convertHtmlToMarkdownWithTurndown(processedHtml);

  return { title: '', markdown };
}

// 处理HTML中的图片，上传到图床并替换URL
async function processImagesInHtml(html: string, session: any): Promise<string> {
  // 检查环境变量
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    console.warn('R2 配置缺失，跳过图片上传处理');
    return html;
  }

  // 使用正则表达式匹配所有img标签，并提取src属性
  const imgRegex = /<img[^>]*>/g;
  let processedHtml = html;
  const imgTags = Array.from(html.matchAll(imgRegex));

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



      const isFeiShuImage = originalSrc.includes('feishu.cn') || originalSrc.includes('larksuite.com');

      if (isFeiShuImage) {
        // 对于飞书图片，直接下载（使用公开的asynccode URL）
        console.log('处理飞书图片:', originalSrc);

        try {
          const imageBlob = await downloadImage(originalSrc);
          if (imageBlob) {
            const uploadedUrl = await uploadImageToR2(imageBlob, originalSrc, session);
            if (uploadedUrl) {
              processedHtml = processedHtml.replace(fullImgTag, fullImgTag.replace(originalSrc, uploadedUrl));
              console.log('飞书图片上传成功:', originalSrc, '->', uploadedUrl);
            }
          } else {
            console.warn('飞书图片下载失败，保留原始URL:', originalSrc);
          }
        } catch (error) {
          console.warn('飞书图片处理失败，保留原始URL:', originalSrc, error);
        }
      } else {
        // 处理非飞书图片
        const imageBlob = await downloadImage(originalSrc);
        if (!imageBlob) {
          console.warn('下载图片失败:', originalSrc);
          continue;
        }

        // 上传到R2
        const uploadedUrl = await uploadImageToR2(imageBlob, originalSrc, session);
        if (uploadedUrl) {
          // 替换HTML中的图片URL
          processedHtml = processedHtml.replace(fullImgTag, fullImgTag.replace(originalSrc, uploadedUrl));
          console.log('图片上传成功:', originalSrc, '->', uploadedUrl);
        }
      }
    } catch (error) {
      console.error('处理图片失败:', originalSrc, error);
    }
  }

  return processedHtml;
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

// 上传图片到R2
async function uploadImageToR2(blob: Blob, originalUrl: string, session: any): Promise<string | null> {
  try {
    // 生成文件名
    const urlParts = originalUrl.split('/');
    const originalFileName = urlParts[urlParts.length - 1] || 'image';
    const fileExtension = getFileExtension(blob.type, originalFileName);
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

    // 将Blob转换为Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: blob.type,
      ContentLength: buffer.length,
      Metadata: {
        'uploaded-by': session.user?.email || 'unknown',
        'upload-time': new Date().toISOString(),
        'source': 'feishu-import',
        'original-url': Buffer.from(originalUrl, 'utf8').toString('base64'),
      },
    });

    await r2Client.send(uploadCommand);

    // 构建公开访问URL
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${filePath}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filePath}`;

    return publicUrl;
  } catch (error) {
    console.error('上传图片到R2失败:', error);
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
