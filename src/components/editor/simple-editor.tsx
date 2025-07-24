'use client';

import { useState, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, FileText, Loader2, Copy, Chrome, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { countWords, calculateReadingTime } from '@/lib/utils';

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => Promise<void>;
}

export function SimpleEditor({ 
  initialTitle = '', 
  initialContent = '', 
  onSave 
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [preview, setPreview] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'default' | 'tech' | 'minimal'>('default');
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // 计算统计信息
  const wordCount = countWords(content);
  const readingTime = calculateReadingTime(content);

  // 转换预览
  const handlePreview = useCallback(async () => {
    if (!content.trim()) {
      setPreview('');
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platform: 'wechat',
          style: selectedStyle,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPreview(data.data.html);
      } else {
        console.error('转换失败:', data.error);
      }
    } catch (error) {
      console.error('转换错误:', error);
    } finally {
      setIsConverting(false);
    }
  }, [content, selectedStyle]);

  // 自动预览
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [handlePreview]);

  // 保存文章
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(title, content);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 复制到剪贴板供Chrome插件使用
  const handleCopyForExtension = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请先填写标题和内容');
      return;
    }

    if (!preview) {
      alert('请先生成预览');
      return;
    }

    setIsCopying(true);
    try {
      // 创建包含字流数据的特殊格式
      const extensionData = {
        title: title.trim(),
        content: preview,
        platform: 'wechat',
        style: selectedStyle,
        timestamp: new Date().toISOString(),
      };

      // 创建特殊格式的文本，包含隐藏的数据标记
      const clipboardText = `<!-- ZILIU_DATA -->${JSON.stringify(extensionData)}<!-- /ZILIU_DATA -->

${title}

${content}`;

      await navigator.clipboard.writeText(clipboardText);

      // 同时保存到localStorage作为备用
      localStorage.setItem('ziliu_clipboard_data', JSON.stringify(extensionData));

      alert('内容已复制！现在可以在公众号页面使用Chrome插件一键填充。');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请重试');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 工具栏 */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回工作台
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-300"></div>
            <FileText className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-500">
              {wordCount} 字 · 预计阅读 {readingTime} 分钟
            </span>
            {lastSaved && (
              <span className="text-sm text-gray-400">
                上次保存: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="default">默认样式</option>
              <option value="tech">技术风格</option>
              <option value="minimal">简约风格</option>
            </select>
            

            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyForExtension}
              disabled={isCopying || !preview}
            >
              {isCopying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="h-4 w-4" />
              )}
              复制到插件
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 flex">
        {/* 编辑器 */}
        <div className="w-1/2 flex flex-col border-r">
          <div className="p-4 border-b">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题..."
              className="text-lg font-medium border-none px-0 focus-visible:ring-0"
            />
          </div>
          
          <div className="flex-1 p-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入Markdown内容...

# 示例标题

这是一个段落示例。

## 二级标题

- 列表项1
- 列表项2

```javascript
console.log('代码示例');
```

> 这是一个引用块
"
              className="h-full resize-none border-none px-0 focus-visible:ring-0 font-mono text-sm"
            />
          </div>
        </div>

        {/* 预览区 */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium text-gray-700">公众号预览（手机视图）</h3>
          </div>

          <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 flex justify-center items-center">
            {/* iPhone 样机 */}
            <div className="relative">
              {/* 手机外壳 - iPhone 14 Pro 样式 */}
              <div className="w-[390px] h-[844px] bg-black rounded-[60px] p-2 shadow-2xl">
                {/* 屏幕 */}
                <div className="w-full h-full bg-white rounded-[48px] overflow-hidden flex flex-col relative">
                  {/* 动态岛 */}
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-black rounded-full z-10"></div>

                  {/* 状态栏 */}
                  <div className="h-12 bg-white flex items-center justify-between px-6 pt-4">
                    <div className="text-sm font-semibold text-black">9:41</div>
                    <div className="flex items-center space-x-1">
                      {/* 信号 */}
                      <div className="flex space-x-1">
                        <div className="w-1 h-3 bg-black rounded-full"></div>
                        <div className="w-1 h-4 bg-black rounded-full"></div>
                        <div className="w-1 h-5 bg-black rounded-full"></div>
                        <div className="w-1 h-6 bg-black rounded-full"></div>
                      </div>
                      {/* WiFi */}
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.166 4.999c5.208-5.208 13.651-5.208 18.859 0a.833.833 0 1 1-1.178 1.178c-4.375-4.375-11.471-4.375-15.846 0a.833.833 0 0 1-1.178-1.178z"/>
                        <path d="M5.01 7.844c3.125-3.125 8.195-3.125 11.32 0a.833.833 0 1 1-1.178 1.178c-2.292-2.292-6.014-2.292-8.306 0a.833.833 0 0 1-1.178-1.178z"/>
                        <path d="M7.854 10.688c1.042-1.042 2.734-1.042 3.776 0a.833.833 0 1 1-1.178 1.178.833.833 0 0 0-1.178 0 .833.833 0 0 1-1.178-1.178z"/>
                        <circle cx="10" cy="15" r="1.5"/>
                      </svg>
                      {/* 电池 */}
                      <div className="flex items-center">
                        <div className="w-6 h-3 border border-black rounded-sm relative">
                          <div className="w-4 h-1.5 bg-green-500 rounded-sm absolute top-0.5 left-0.5"></div>
                        </div>
                        <div className="w-0.5 h-1.5 bg-black rounded-r-sm ml-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* 微信公众号头部 */}
                  <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      字
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-base font-medium text-gray-900 truncate">
                        {title || '字流'}
                      </div>
                      <div className="text-xs text-gray-500">刚刚</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                      </svg>
                    </div>
                  </div>

                  {/* 文章内容区域 */}
                  <div className="flex-1 overflow-auto bg-white">
                    <div className="px-4 py-4">
                      {preview ? (
                        <div
                          className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                          style={{
                            fontSize: '16px',
                            lineHeight: '1.7',
                            color: '#333'
                          }}
                          dangerouslySetInnerHTML={{ __html: preview }}
                        />
                      ) : (
                        <div className="text-gray-400 text-center py-16 text-sm">
                          {content ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>转换中...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-gray-300 text-lg">📝</div>
                              <div>开始输入内容以查看预览</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 底部安全区域 */}
                  <div className="h-8 bg-white"></div>
                </div>
              </div>

              {/* 手机标签 */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
                iPhone 14 Pro 预览
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
