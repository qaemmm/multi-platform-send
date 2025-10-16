import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

// 自动清理的天数（默认90天）
const AUTO_CLEANUP_DAYS = parseInt(process.env.AUTO_CLEANUP_DAYS || '90');

export async function GET(request: NextRequest) {
  try {
    // 验证cron密钥（防止未授权访问）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 检查环境变量
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
      return NextResponse.json(
        { success: false, error: 'R2 配置缺失' },
        { status: 500 }
      );
    }

    console.log(`开始自动清理 ${AUTO_CLEANUP_DAYS} 天前的图片`);

    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_CLEANUP_DAYS);

    let deletedCount = 0;
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      // 列出所有图片文件
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: 'images/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const listResponse = await r2Client.send(listCommand);
      
      if (!listResponse.Contents) {
        break;
      }

      // 筛选需要删除的文件
      const filesToDelete = listResponse.Contents.filter(object => {
        if (!object.LastModified || !object.Key) return false;
        return object.LastModified < cutoffDate;
      });

      // 删除文件
      for (const file of filesToDelete) {
        if (!file.Key) continue;

        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: file.Key,
          });
          await r2Client.send(deleteCommand);

          deletedCount++;
          totalSize += file.Size || 0;

          console.log(`已删除: ${file.Key} (${file.Size} bytes, ${file.LastModified})`);
        } catch (error) {
          console.error(`删除文件失败: ${file.Key}`, error);
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    // 格式化文件大小
    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const result = {
      success: true,
      data: {
        deletedCount,
        totalSize: formatSize(totalSize),
        cutoffDate: cutoffDate.toISOString(),
        days: AUTO_CLEANUP_DAYS,
        timestamp: new Date().toISOString(),
      },
    };

    console.log('自动清理完成:', result.data);

    return NextResponse.json(result);

  } catch (error) {
    console.error('自动清理失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '自动清理失败' 
      },
      { status: 500 }
    );
  }
}
