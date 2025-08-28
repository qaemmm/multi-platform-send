'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, X } from 'lucide-react';

interface FeishuImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (title: string, content: string) => void;
}

export function FeishuImportDialog({
  open,
  onOpenChange,
  onImport
}: FeishuImportDialogProps) {
  const [rawContent, setRawContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 处理粘贴事件 - 自动解析并导入
  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const htmlContent = clipboardData.getData('text/html');
    const textContent = clipboardData.getData('text/plain');

    // 优先使用HTML内容，如果没有则使用纯文本
    const content = htmlContent || textContent;
    setRawContent(content);

    // 如果有内容，自动解析并导入
    if (content.trim()) {
      await processAndImport(content);
    }
  };

  // 处理并导入内容
  const processAndImport = async (content: string) => {
    setIsProcessing(true);

    try {
      // 调用解析API
      const response = await fetch('/api/parse-feishu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 直接导入到编辑器
        onImport(data.title || '', data.markdown || '');
        handleClose();
      } else {
        // 降级处理：简单的HTML到Markdown转换
        const simpleMarkdown = convertHtmlToMarkdown(content);
        onImport('', simpleMarkdown);
        handleClose();
      }
    } catch (error) {
      console.error('解析失败:', error);
      // 降级处理
      const simpleMarkdown = convertHtmlToMarkdown(content);
      onImport('', simpleMarkdown);
      handleClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // 简单的HTML到Markdown转换（降级方案）
  const convertHtmlToMarkdown = (html: string): string => {
    let markdown = html;

    // 基本的HTML到Markdown转换
    markdown = markdown
      // 标题
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // 段落
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      
      // 粗体和斜体
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      
      // 列表
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      
      // 引用
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      
      // 代码
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
      
      // 链接
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      
      // 图片
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n')
      
      // 换行
      .replace(/<br\s*\/?>/gi, '\n')
      
      // 清理HTML标签
      .replace(/<[^>]*>/g, '')
      
      // 清理HTML实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 清理多余的换行
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return markdown;
  };

  // 手动导入按钮处理
  const handleManualImport = async () => {
    if (rawContent.trim()) {
      await processAndImport(rawContent);
    }
  };

  // 关闭弹框
  const handleClose = () => {
    setRawContent('');
    setIsProcessing(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* 弹框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              导入飞书文档
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              粘贴飞书内容，自动转换并导入到编辑器
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 主体内容 */}
        <div className="p-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">粘贴飞书内容</label>
            
            <Textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="请在飞书文档中复制内容，然后在此处粘贴...

💡 提示：
1. 在飞书文档中选择要导入的内容
2. 使用 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制
3. 粘贴后会自动解析并导入到编辑器"
              className="h-64 resize-none font-mono text-sm"
              disabled={isProcessing}
            />
            
            {isProcessing && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-blue-700">正在处理内容...</span>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleManualImport}
            disabled={!rawContent.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                处理中...
              </>
            ) : (
              '导入到编辑器'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
