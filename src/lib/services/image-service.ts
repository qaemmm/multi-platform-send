import { db } from '@/lib/db';
import { users, imageUsageStats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { FEATURES } from '../subscription/config/features';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { createQiniuStorageService, type QiniuUploadResult } from './qiniu-storage';
import sharp from 'sharp';

// 支持的存储提供商类型
export type StorageProvider = 'r2' | 'qiniu' | 'auto';

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

// 初始化七牛云服务
const qiniuService = createQiniuStorageService();

// 图片大小限制配置
const IMAGE_SIZE_LIMITS = {
  free: 5 * 1024 * 1024,   // 免费版: 5MB
  pro: 20 * 1024 * 1024,   // 专业版: 20MB
};

// 支持的图片格式
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export interface ImageQuotaResult {
  hasQuota: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  usedCount?: number;
  totalQuota?: number;
  warning?: string;
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadPath?: string;
  error?: string;
  provider?: string; // 新增：标识使用的存储提供商
}

/**
 * 验证图片文件
 */
async function validateImageFile(
  file: File | Blob,
  userEmail: string
): Promise<{ valid: boolean; error?: string }> {
  // 检查文件大小
  if (file.size === 0) {
    return { valid: false, error: '文件为空' };
  }

  // 获取用户计划信息
  const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
  if (!user.length) {
    return { valid: false, error: '用户不存在' };
  }

  const userPlan = user[0].plan || 'free';
  const planExpiredAt = user[0].planExpiredAt;
  const isPro = userPlan === 'pro' && (!planExpiredAt || new Date(planExpiredAt) > new Date());

  // 检查文件大小限制
  const sizeLimit = isPro ? IMAGE_SIZE_LIMITS.pro : IMAGE_SIZE_LIMITS.free;
  if (file.size > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024));
    const fileSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100;
    return {
      valid: false,
      error: `文件大小超过限制（${fileSizeMB}MB > ${limitMB}MB）${isPro ? '' : '，升级专业版可上传更大文件'}`
    };
  }

  // 检查文件类型
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '不支持的文件格式，仅支持 JPEG、PNG、GIF、WebP'
    };
  }

  return { valid: true };
}

/**
 * 检查用户的图片上传配额
 */
export async function checkImageQuota(userEmail: string): Promise<ImageQuotaResult> {
  try {
    // 获取用户订阅信息
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!user.length) {
      return { hasQuota: false, reason: '用户不存在' };
    }

    const userPlan = user[0].plan || 'free';
    const planExpiredAt = user[0].planExpiredAt;

    // 检查专业版是否过期
    const isPro = userPlan === 'pro' && (!planExpiredAt || new Date(planExpiredAt) > new Date());

    // 获取图片功能配置
    const feature = FEATURES['cloud-images'];
    if (!feature) {
      return { hasQuota: false, reason: '图片功能配置不存在' };
    }

    // 获取当前用户的配额限制
    const quota = isPro ? feature.limits?.pro : feature.limits?.free;
    if (!quota || quota <= 0) {
      return { hasQuota: false, reason: '当前订阅计划无图片配额' };
    }

    // 检查当月图片使用量
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM格式
    const usageStats = await db
      .select()
      .from(imageUsageStats)
      .where(and(
        eq(imageUsageStats.userId, user[0].id),
        eq(imageUsageStats.month, currentMonth)
      ))
      .limit(1);

    const usedCount = usageStats.length > 0 ? usageStats[0].usedCount : 0;

    if (usedCount >= quota) {
      return {
        hasQuota: false,
        reason: `当月图片使用量已达上限（${usedCount}/${quota}张）`,
        upgradeRequired: !isPro,
        usedCount,
        totalQuota: quota
      };
    }

    return {
      hasQuota: true,
      usedCount,
      totalQuota: quota
    };

  } catch (error) {
    console.error('检查图片配额失败:', error);
    return { hasQuota: false, reason: '系统错误' };
  }
}

/**
 * 更新用户的月度图片使用量统计
 */
export async function updateImageUsageStats(userEmail: string): Promise<void> {
  try {
    // 获取用户信息
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!user.length) {
      throw new Error('用户不存在');
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM格式
    const userId = user[0].id;

    // 查找当月使用量统计记录
    const existingStats = await db
      .select()
      .from(imageUsageStats)
      .where(and(
        eq(imageUsageStats.userId, userId),
        eq(imageUsageStats.month, currentMonth)
      ))
      .limit(1);

    if (existingStats.length > 0) {
      // 更新现有记录
      await db
        .update(imageUsageStats)
        .set({
          usedCount: existingStats[0].usedCount + 1,
          updatedAt: new Date()
        })
        .where(eq(imageUsageStats.id, existingStats[0].id));
    } else {
      // 创建新记录
      await db.insert(imageUsageStats).values({
        userId,
        month: currentMonth,
        usedCount: 1
      });
    }
  } catch (error) {
    console.error('更新图片使用量统计失败:', error);
    throw error;
  }
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @returns 压缩后的Buffer
 */
async function compressImage(file: File | Blob): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 使用sharp压缩图片
  // 设置质量为80，最大宽度2048px，保持宽高比
  return await sharp(buffer)
    .resize(2048, 2048, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * 上传图片到R2存储
 */
export async function uploadImageToR2(
  file: File | Blob,
  fileName: string,
  userEmail: string
): Promise<ImageUploadResult> {
  try {
    // 检查环境变量
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      return { success: false, error: '服务器配置错误' };
    }

    // 验证图片文件
    const validation = await validateImageFile(file, userEmail);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 检查用户配额
    const quotaCheck = await checkImageQuota(userEmail);
    if (!quotaCheck.hasQuota) {
      return {
        success: false,
        error: quotaCheck.reason || '配额不足'
      };
    }

    // 生成唯一文件名
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueFileName}`;

    // 压缩图片
    const compressedBuffer = await compressImage(file);
    const originalSize = file.size;
    const compressedSize = compressedBuffer.length;
    console.log(`图片压缩: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedSize / 1024 / 1024).toFixed(2)}MB (压缩率: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%)`);

    // 上传到 R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      Body: compressedBuffer,
      ContentType: 'image/jpeg',
      ContentLength: compressedBuffer.length,
      Metadata: {
        'uploaded-by': userEmail,
        'upload-time': new Date().toISOString(),
        'original-name': Buffer.from(fileName, 'utf8').toString('base64'),
        'original-size': originalSize.toString(),
        'compressed-size': compressedSize.toString(),
      },
    });

    await r2Client.send(uploadCommand);

    // 更新使用量统计
    await updateImageUsageStats(userEmail);

    // 构建公开访问 URL
    // 构建公开访问 URL：优先使用配置的公共域名；否则使用 r2.dev 公共访问域名
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${filePath}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${filePath}`;

    return {
      success: true,
      url: publicUrl,
      fileName,
      fileSize: compressedSize,
      fileType: 'image/jpeg',
      uploadPath: filePath,
      provider: 'r2'
    };

  } catch (error) {
    console.error('图片上传失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

/**
 * 上传图片到七牛云
 */
export async function uploadImageToQiniu(
  file: File | Blob,
  fileName: string,
  userEmail: string
): Promise<ImageUploadResult> {
  try {
    if (!qiniuService) {
      return { success: false, error: '七牛云服务未配置' };
    }

    // 验证图片文件
    const validation = await validateImageFile(file, userEmail);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 检查用户配额
    const quotaCheck = await checkImageQuota(userEmail);
    if (!quotaCheck.hasQuota) {
      return {
        success: false,
        error: quotaCheck.reason || '配额不足'
      };
    }

    // 压缩图片
    const compressedBuffer = await compressImage(file);
    const originalSize = file.size;
    const compressedSize = compressedBuffer.length;
    console.log(`[七牛云]图片压缩: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);

    // 将Buffer转为Blob用于上传
    const compressedBlob = new Blob([compressedBuffer], { type: 'image/jpeg' });

    // 上传到七牛云
    const result = await qiniuService.uploadFile(compressedBlob, fileName);

    if (result.success) {
      // 更新使用量统计
      await updateImageUsageStats(userEmail);

      return {
        ...result,
        provider: 'qiniu'
      };
    }

    return result;

  } catch (error) {
    console.error('七牛云上传失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
      provider: 'qiniu'
    };
  }
}

/**
 * 智能上传图片 - 根据配置选择存储提供商
 */
export async function uploadImage(
  file: File | Blob,
  fileName: string,
  userEmail: string,
  preferredProvider?: StorageProvider
): Promise<ImageUploadResult> {
  const provider = preferredProvider || (process.env.IMAGE_STORAGE_PROVIDER as StorageProvider) || 'auto';

  console.log(`📤 开始上传图片，提供商策略: ${provider}`);

  switch (provider) {
    case 'r2':
      return await uploadImageToR2(file, fileName, userEmail);

    case 'qiniu':
      return await uploadImageToQiniu(file, fileName, userEmail);

    case 'auto':
    default:
      // 自动模式：优先使用R2，失败时回退到七牛云
      console.log('🔄 尝试使用 R2 上传...');
      const r2Result = await uploadImageToR2(file, fileName, userEmail);

      if (r2Result.success) {
        console.log('✅ R2 上传成功');
        return r2Result;
      }

      console.log('❌ R2 上传失败，回退到七牛云:', r2Result.error);

      if (qiniuService) {
        console.log('🔄 尝试使用七牛云上传...');
        const qiniuResult = await uploadImageToQiniu(file, fileName, userEmail);

        if (qiniuResult.success) {
          console.log('✅ 七牛云上传成功');
          return qiniuResult;
        }

        console.log('❌ 七牛云上传也失败:', qiniuResult.error);
        return {
          success: false,
          error: `所有存储服务都失败 - R2: ${r2Result.error}, 七牛云: ${qiniuResult.error}`,
          provider: 'auto'
        };
      } else {
        return {
          ...r2Result,
          error: `R2上传失败且七牛云未配置: ${r2Result.error}`
        };
      }
  }
}

/**
 * 从URL下载图片并智能上传
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  userEmail: string,
  preferredProvider?: StorageProvider
): Promise<ImageUploadResult> {
  try {
    // 下载图片
    const imageBlob = await downloadImage(imageUrl);
    if (!imageBlob) {
      return { success: false, error: '下载图片失败' };
    }

    // 从URL提取文件名，清理查询参数
    const urlParts = imageUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1] || 'image.jpg';
    // 移除查询参数（?之后的部分）
    const cleanFileName = lastPart.split('?')[0] || 'image.jpg';

    // 对于飞书等特殊情况，如果文件名还是很复杂，简化为通用名称
    let finalFileName = cleanFileName;

    // 如果文件名过长或包含特殊字符，使用简化名称
    if (cleanFileName.length > 50 || /[^\w\-.]/.test(cleanFileName)) {
      const extension = cleanFileName.includes('.') ? cleanFileName.split('.').pop() : 'jpg';
      finalFileName = `feishu-image.${extension}`;
    }

    // 确保有文件扩展名
    if (!finalFileName.includes('.')) {
      finalFileName += '.jpg';
    }

    // 使用智能上传
    return await uploadImage(imageBlob, finalFileName, userEmail, preferredProvider);

  } catch (error) {
    console.error('从URL上传图片失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
}

/**
 * 下载图片（带超时和重试机制）
 */
async function downloadImage(url: string): Promise<Blob | null> {
  const maxRetries = 2;
  const timeoutMs = 10000; // 10秒超时

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

      // 创建带超时的 AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(fullUrl, {
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error('不是有效的图片类型');
        }

        return await response.blob();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      if (isLastAttempt) {
        console.error(`下载图片失败 (所有 ${maxRetries + 1} 次尝试都失败):`, url, errorMessage);
        return null;
      } else {
        console.warn(`下载图片失败 (第 ${attempt + 1} 次尝试):`, url, errorMessage, '- 将重试');
        // 短暂延迟后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  return null;
}