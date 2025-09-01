import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { applySubscriptionCheck } from '@/lib/middleware/subscription';
import { db } from '@/lib/db';
import { imageUsageStats, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

// 支持的图片格式
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 更新用户的月度图片使用量统计
 */
async function updateImageUsageStats(userEmail: string) {
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

export async function POST(request: NextRequest) {
  try {
    // 先检查订阅权限
    const subscriptionCheck = await applySubscriptionCheck(request, 'cloud-images');
    if (subscriptionCheck) {
      return subscriptionCheck; // 返回权限检查失败的响应
    }

    // 权限检查通过，获取session（中间件已经验证过认证）
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查环境变量
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      console.error('R2 配置缺失');
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件格式，仅支持 JPEG、PNG、GIF、WebP' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '文件大小超过限制（最大 10MB）' },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

    // 将文件转换为 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到 R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length,
      Metadata: {
        'uploaded-by': session.user?.email || 'unknown',
        'upload-time': new Date().toISOString(),
        // 对中文文件名进行 Base64 编码以避免 HTTP 头部字符问题
        'original-name': Buffer.from(file.name, 'utf8').toString('base64'),
      },
    });

    await r2Client.send(uploadCommand);

    // 更新使用量统计
    if (session.user?.email) {
      await updateImageUsageStats(session.user.email);
    }

    // 构建公开访问 URL
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${filePath}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filePath}`;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadPath: filePath,
      },
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '上传失败，请重试' 
      },
      { status: 500 }
    );
  }
}
