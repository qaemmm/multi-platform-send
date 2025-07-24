'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText, Upload, History, LogOut, User } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">字流</h1>
              <span className="text-gray-500">工作台</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{session.user?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            欢迎回来，{session.user?.name}！
          </h2>
          <p className="text-gray-600">
            开始创作您的下一篇文章，让文字如流水般顺畅发布
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">新建文章</CardTitle>
              </div>
              <CardDescription>
                创建一篇新的文章，支持Markdown编辑
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/editor/new">
                <Button className="w-full">
                  开始创作
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">导入文档</CardTitle>
              </div>
              <CardDescription>
                从Word、Markdown文件导入内容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                即将推出
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">历史文章</CardTitle>
              </div>
              <CardDescription>
                查看和管理您的所有文章
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                查看历史
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">最近文章</h3>
          
          {articles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">还没有文章</h4>
                <p className="text-gray-600 mb-4">
                  创建您的第一篇文章，开始您的内容创作之旅
                </p>
                <Link href="/editor/new">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    新建文章
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 这里将来会显示文章列表 */}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">总文章数</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">已发布</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-gray-600">草稿</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">0小时</div>
              <div className="text-sm text-gray-600">节省时间</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
