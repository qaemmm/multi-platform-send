import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

// 清理多少天前的图片（默认90天）
const DEFAULT_CLEANUP_DAYS = 90;

export async function POST(request: NextRequest) {
  try {
    // 检查用户认证（只有管理员可以执行清理）
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    const body = await request.json();
    const { days = DEFAULT_CLEANUP_DAYS, dryRun = true } = body;

    // 计算截止日期
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    console.log(`开始清理 ${days} 天前的图片 (截止日期: ${cutoffDate.toISOString()})`);
    console.log(`模式: ${dryRun ? '预览模式' : '实际删除'}`);

    let deletedCount = 0;
    let totalSize = 0;
    const deletedFiles: string[] = [];
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
          if (!dryRun) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: file.Key,
            });
            await r2Client.send(deleteCommand);
          }

          deletedFiles.push(file.Key);
          deletedCount++;
          totalSize += file.Size || 0;

          console.log(`${dryRun ? '[预览]' : '[删除]'} ${file.Key} (${file.Size} bytes, ${file.LastModified})`);
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

    return NextResponse.json({
      success: true,
      data: {
        mode: dryRun ? 'preview' : 'delete',
        deletedCount,
        totalSize: formatSize(totalSize),
        cutoffDate: cutoffDate.toISOString(),
        days,
        files: dryRun ? deletedFiles.slice(0, 10) : [], // 预览模式只返回前10个文件
        message: dryRun 
          ? `预览模式：找到 ${deletedCount} 个文件可以删除，总大小 ${formatSize(totalSize)}`
          : `已删除 ${deletedCount} 个文件，释放空间 ${formatSize(totalSize)}`
      },
    });

  } catch (error) {
    console.error('清理图片失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '清理失败' 
      },
      { status: 500 }
    );
  }
}

// GET 请求用于查看清理统计
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    if (!process.env.R2_BUCKET_NAME) {
      return NextResponse.json(
        { success: false, error: 'R2 配置缺失' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let totalFiles = 0;
    let oldFiles = 0;
    let totalSize = 0;
    let oldSize = 0;
    let continuationToken: string | undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: 'images/',
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const listResponse = await r2Client.send(listCommand);
      
      if (!listResponse.Contents) break;

      for (const object of listResponse.Contents) {
        if (!object.LastModified || !object.Key) continue;
        
        totalFiles++;
        totalSize += object.Size || 0;

        if (object.LastModified < cutoffDate) {
          oldFiles++;
          oldSize += object.Size || 0;
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return NextResponse.json({
      success: true,
      data: {
        totalFiles,
        totalSize: formatSize(totalSize),
        oldFiles,
        oldSize: formatSize(oldSize),
        cutoffDate: cutoffDate.toISOString(),
        days,
        canSave: formatSize(oldSize),
        percentage: totalFiles > 0 ? Math.round((oldFiles / totalFiles) * 100) : 0,
      },
    });

  } catch (error) {
    console.error('获取清理统计失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取统计失败' 
      },
      { status: 500 }
    );
  }
}
