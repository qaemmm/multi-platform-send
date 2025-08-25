'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-100/80 backdrop-blur-sm">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">字</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              字流
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {status === 'loading' ? (
              <div className="flex items-center space-x-3">
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  欢迎，{session.user?.name || session.user?.email}
                </span>
                <Link href="/dashboard">
                  <Button size="sm">进入工作台</Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">登录</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">免费注册</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Hero Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-full text-sm text-blue-800 font-medium mb-8 shadow-lg shadow-blue-100/50 hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-0.5">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            MVP版本现已上线，免费体验
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              让文字如流水般
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-md">
              顺畅发布
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed max-w-3xl mx-auto font-light">
            AI驱动的多平台内容发布工具，一次创作，智能适配
            <span className="text-blue-600 font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">公众号、知乎、掘金、小红书</span>
            等平台格式
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            {session ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
                    🚀 进入工作台
                  </Button>
                </Link>
                <Link href="/editor/new">
                  <Button variant="outline" size="lg" className="px-10 py-4 text-lg font-semibold border-2 hover:border-blue-600 hover:text-blue-600 transition-all duration-300 hover:-translate-y-1">
                    ✍️ 开始创作
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signup">
                  <Button size="lg" className="px-10 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
                    🚀 立即免费使用
                  </Button>
                </Link>
                <Link href="/auth/signin">
                  <Button variant="outline" size="lg" className="px-10 py-4 text-lg font-semibold border-2 hover:border-blue-600 hover:text-blue-600 transition-all duration-300 hover:-translate-y-1">
                    已有账户？登录
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100/50 hover:border-blue-200 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto shadow-md">
                ✍️
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">一次创作</h3>
              <p className="text-gray-600 leading-relaxed font-light">Markdown编辑器，支持实时预览，让创作更加流畅</p>
            </div>

            <div className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100/50 hover:border-green-200 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto shadow-md">
                🎨
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">智能适配</h3>
              <p className="text-gray-600 leading-relaxed font-light">AI自动转换各平台格式，无需手动调整样式</p>
            </div>

            <div className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100/50 hover:border-purple-200 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto shadow-md">
                🚀
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">多平台发布</h3>
              <p className="text-gray-600 leading-relaxed font-light">支持公众号、知乎、掘金等主流平台</p>
            </div>

            <div className="group bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100/50 hover:border-orange-200 hover:-translate-y-2 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto shadow-md">
                🔌
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">Chrome插件</h3>
              <p className="text-gray-600 leading-relaxed font-light">一键自动填充，3分钟完成发布</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-sm border-t border-gray-200/50">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">字</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                字流
              </span>
            </div>
            <div className="text-gray-600 text-center md:text-right">
              <p className="mb-1 font-light">&copy; 2025 字流. 让文字如流水般顺畅发布.</p>
              <p className="text-sm font-light">MVP版本 · 持续优化中</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
