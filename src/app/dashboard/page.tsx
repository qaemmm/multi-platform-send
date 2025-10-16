'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText, LogOut, User, ChevronLeft, ChevronRight, Crown, Gift } from 'lucide-react';
import { RedeemCodeDialog } from '@/components/ui/redeem-code-dialog';
import { useUserPlan } from '@/lib/subscription/hooks/useUserPlan';
import { UpgradePrompt } from '@/lib/subscription/components/UpgradePrompt';
import { ArticleCreationGuard } from '@/lib/subscription/components/FeatureGuard';
import { CustomerSupportButton } from '@/components/ui/customer-support-button';

interface Article {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  wordCount: number;
  readingTime: number;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const articlesPerPage = 5;
  
  // 使用新的订阅Hook，已包含文章数量管理
  const { plan, planExpiredAt, isPro, totalArticles, getFeatureLimit, refreshPlan, refreshUsage } = useUserPlan();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // 获取文章列表
    fetchArticles();
  }, [session, status, router]);

  const fetchArticles = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/articles?page=${page}&limit=${articlesPerPage}`);
      const data = await response.json();

      if (data.success) {
        setArticles(data.data.articles);
        setTotalPages(Math.ceil(data.data.total / articlesPerPage));
        setCurrentPage(page);
        // 如果文章数量有变化，更新使用统计
        if (data.data.total !== totalArticles) {
          refreshUsage();
        }
      } else {
        console.error('获取文章列表失败:', data.error);
      }
    } catch (error) {
      console.error('获取文章列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchArticles(page);
    }
  };

  const handleRedeemSuccess = (data: any) => {
    // 刷新订阅信息
    refreshPlan();
    
    // 显示成功提示
    alert(data.message);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // 格式化过期时间
  const formatExpiredDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };
  
  // 检查文章限制
  const articleLimit = getFeatureLimit('unlimited-articles');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">字</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    字流
                  </h1>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* 订阅状态 */}
              <div className={`flex items-center space-x-3 px-3 py-2 rounded-full border ${
                isPro 
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
                  : 'bg-white/60 border-white/40'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isPro 
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                }`}>
                  {isPro ? (
                    <Crown className="h-3 w-3 text-white" />
                  ) : (
                    <User className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name}
                  </span>
                  {isPro ? (
                    <span className="text-xs text-yellow-600">
                      专业版 · 至{formatExpiredDate(planExpiredAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      免费版 · {articleLimit > 0 && `${totalArticles}/${articleLimit}文章`}
                    </span>
                  )}
                </div>
              </div>
              
              {/* 订阅管理区域 */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRedeemDialog(true)}
                  className="bg-white/60 border-white/40 hover:bg-white/80 backdrop-blur-sm"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  兑换码
                </Button>
                
                {!isPro && (
                  <Link href="/pricing">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-yellow-700 hover:from-yellow-100 hover:to-orange-100 hover:border-yellow-300"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      了解专业版
                    </Button>
                  </Link>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="bg-white/60 border-white/40 hover:bg-white/80 backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="inline-flex items-center px-3 py-1.5 bg-blue-100/60 text-blue-700 rounded-full text-sm font-medium mb-4">
            ✨ 欢迎回来，{session.user?.name}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            开始创作
          </h2>
          <p className="text-gray-600 text-lg">
            让文字如流水般顺畅，一键发布到多个平台
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <PlusCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">新建文章</h3>
                  <p className="text-sm text-gray-600">开始创作新的内容</p>
                </div>
              </div>
              <ArticleCreationGuard>
                <Link href="/editor/new">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200">
                    开始创作
                  </Button>
                </Link>
              </ArticleCreationGuard>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">文章管理</h3>
                  <p className="text-sm text-gray-600">管理您的所有文章</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 font-medium py-2.5 rounded-lg transition-all duration-200"
                onClick={() => {
                  document.getElementById('recent-articles')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                查看文章
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <div className="mb-8" id="recent-articles">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">我的文章</h3>
            <p className="text-gray-600">管理和编辑您的创作内容</p>
          </div>

          {loading ? (
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </CardContent>
            </Card>
          ) : articles.length === 0 ? (
            <Card className="border-0 bg-white/70 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">还没有文章</h4>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  创建您的第一篇文章，开始您的内容创作之旅
                </p>
                <Link href="/editor/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    创建第一篇文章
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-all duration-200 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                            {article.title}
                          </h4>
                          <div className="flex items-center space-x-3 text-sm text-gray-500 mb-3">
                            <span>{new Date(article.updatedAt).toLocaleDateString('zh-CN')}</span>
                            <span>·</span>
                            <span>{article.wordCount} 字</span>
                            <span>·</span>
                            <span>{article.readingTime} 分钟</span>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                            {article.content.replace(/[#*`]/g, '').substring(0, 120)}...
                          </p>
                        </div>
                        <div className="flex ml-6">
                          <Link href={`/editor/${article.id}`}>
                            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                              继续编辑
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={`w-9 h-9 p-0 ${
                          currentPage === page
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 升级提示 - 只在免费用户达到限制时显示 */}
        {!isPro && articleLimit > 0 && totalArticles >= articleLimit && (
          <div className="mt-8">
            <UpgradePrompt scenario="dashboard-upgrade" />
          </div>
        )}

      </main>

      {/* 兑换码对话框 */}
      <RedeemCodeDialog
        isOpen={showRedeemDialog}
        onClose={() => setShowRedeemDialog(false)}
        onSuccess={handleRedeemSuccess}
      />
      
      {/* 全局浮动客服按钮 */}
      <CustomerSupportButton />
    </div>
  );
}
