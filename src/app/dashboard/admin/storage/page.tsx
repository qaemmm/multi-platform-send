'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Eye, RefreshCw, HardDrive, Calendar, FileImage } from 'lucide-react';

interface StorageStats {
  totalFiles: number;
  totalSize: string;
  oldFiles: number;
  oldSize: string;
  cutoffDate: string;
  days: number;
  canSave: string;
  percentage: number;
}

interface CleanupResult {
  mode: 'preview' | 'delete';
  deletedCount: number;
  totalSize: string;
  cutoffDate: string;
  days: number;
  files?: string[];
  message: string;
}

export default function StorageManagePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取存储统计
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/cleanup-images?days=${days}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || '获取统计失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计失败');
    } finally {
      setLoading(false);
    }
  };

  // 执行清理（预览或实际删除）
  const performCleanup = async (dryRun: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setCleanupResult(null);
      
      const response = await fetch('/api/cleanup-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days,
          dryRun,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCleanupResult(data.data);
        // 如果是实际删除，刷新统计
        if (!dryRun) {
          await fetchStats();
        }
      } else {
        setError(data.error || '清理失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [days]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">存储管理</h1>
          <p className="text-muted-foreground">管理R2存储桶中的图片文件</p>
        </div>
        <Button onClick={fetchStats} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新统计
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 存储统计 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总文件数</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                总大小: {stats.totalSize}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可清理文件</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.oldFiles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.days} 天前的文件
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可释放空间</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.canSave}</div>
              <p className="text-xs text-muted-foreground">
                占总空间 {stats.percentage}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 清理设置 */}
      <Card>
        <CardHeader>
          <CardTitle>清理设置</CardTitle>
          <CardDescription>
            设置要清理多少天前的图片文件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="days">清理天数</Label>
              <Input
                id="days"
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 90)}
                min="1"
                max="365"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                删除 {days} 天前上传的图片
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={() => performCleanup(true)}
              disabled={loading || !stats}
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              预览清理
            </Button>
            <Button
              onClick={() => performCleanup(false)}
              disabled={loading || !stats || stats.oldFiles === 0}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              执行清理
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 清理结果 */}
      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {cleanupResult.mode === 'preview' ? '预览结果' : '清理结果'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{cleanupResult.message}</AlertDescription>
            </Alert>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">文件数量:</span> {cleanupResult.deletedCount}
              </div>
              <div>
                <span className="font-medium">释放空间:</span> {cleanupResult.totalSize}
              </div>
              <div>
                <span className="font-medium">截止日期:</span> {new Date(cleanupResult.cutoffDate).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">清理天数:</span> {cleanupResult.days} 天
              </div>
            </div>

            {cleanupResult.files && cleanupResult.files.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">示例文件 (前10个):</h4>
                <div className="bg-muted p-3 rounded text-sm font-mono max-h-40 overflow-y-auto">
                  {cleanupResult.files.map((file, index) => (
                    <div key={index}>{file}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>预览清理</strong>: 查看哪些文件会被删除，不会实际删除文件</p>
          <p>• <strong>执行清理</strong>: 实际删除指定天数前的图片文件</p>
          <p>• 建议定期清理90天以上的图片以控制存储成本</p>
          <p>• 清理操作不可逆，请谨慎操作</p>
        </CardContent>
      </Card>
    </div>
  );
}
