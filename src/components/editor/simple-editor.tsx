'use client';

import { useState, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Eye, FileText, Loader2, Copy, Chrome, ArrowLeft } from 'lucide-react';
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
              onClick={handlePreview}
              disabled={isConverting}
            >
              {isConverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              预览
            </Button>
            
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
            <h3 className="font-medium text-gray-700">公众号预览</h3>
          </div>
          
          <div className="flex-1 p-4 overflow-auto bg-gray-50">
            <Card className="max-w-none">
              <CardHeader>
                <CardTitle className="text-lg">{title || '未命名文章'}</CardTitle>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div dangerouslySetInnerHTML={{ __html: preview }} />
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    {content ? '转换中...' : '开始输入内容以查看预览'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
