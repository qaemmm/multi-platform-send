'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileText,
  Wand2,
  AlertCircle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';

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
  const [previewContent, setPreviewContent] = useState('');
  const [extractedTitle, setExtractedTitle] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // 检测是否为飞书内容
  const isFeishuContent = (content: string): boolean => {
    // 检测飞书特有的HTML结构或标识
    const feishuIndicators = [
      'data-lake-id',
      'lark-record-data',
      'feishu.cn',
      'larksuite.com',
      'data-card-value'
    ];
    
    return feishuIndicators.some(indicator => 
      content.includes(indicator)
    );
  };

  // 解析飞书内容
  const parseFeishuContent = async (content: string) => {
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
        setExtractedTitle(data.title || '');
        setPreviewContent(data.markdown || '');
        setShowPreview(true);
      } else {
        // 降级处理：简单的HTML到Markdown转换
        const simpleMarkdown = convertHtmlToMarkdown(content);
        setPreviewContent(simpleMarkdown);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('解析失败:', error);
      // 降级处理
      const simpleMarkdown = convertHtmlToMarkdown(content);
      setPreviewContent(simpleMarkdown);
      setShowPreview(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // 简单的HTML到Markdown转换（降级方案）
  const convertHtmlToMarkdown = (html: string): string => {
    let markdown = html;

    // 预处理：处理飞书特有的结构
    markdown = markdown
      // 处理div换行
      .replace(/<div[^>]*>\s*<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')

      // 清理span标签
      .replace(/<span[^>]*>/g, '')
      .replace(/<\/span>/g, '');

    // 特殊处理：识别飞书中的Markdown风格标题（如 "### 1. 标题"）
    markdown = markdown.replace(/^(#{1,6})\s*(\d+\.?\s*)(.*?)$/gm, (match, hashes, number, title) => {
      const level = hashes.length;
      const cleanTitle = `${number}${title}`.trim();
      return `<h${level}>${cleanTitle}</h${level}>`;
    });

    // 特殊处理：修复飞书中 "1. ### 标题" 格式的问题
    markdown = markdown.replace(/^(\d+\.)\s*(#{1,6})\s*(.*?)$/gm, (match, number, hashes, title) => {
      // 将 "1. ### 标题" 转换为 "### 1. 标题"
      const cleanTitle = `${number} ${title}`.trim();
      return `${hashes} ${cleanTitle}`;
    });

    // 基本的HTML到Markdown转换
    markdown = markdown
      // 标题 - 处理飞书特有的标题格式
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `# ${cleanContent}\n\n`;
      })
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `## ${cleanContent}\n\n`;
      })
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `### ${cleanContent}\n\n`;
      })
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `#### ${cleanContent}\n\n`;
      })
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `##### ${cleanContent}\n\n`;
      })
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `###### ${cleanContent}\n\n`;
      })

      // 段落 - 更好地处理内容
      .replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
        const cleanContent = content.trim();
        return cleanContent ? cleanContent + '\n\n' : '\n';
      })

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

      // 图片 - 确保图片后有换行
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n')

      // 换行
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<br[^>]*>/gi, '\n')

      // 清理HTML标签
      .replace(/<[^>]*>/g, '')

      // 清理HTML实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 处理换行和空格
    markdown = markdown
      .replace(/[ \t]+/g, ' ') // 多个空格合并
      .replace(/\n[ \t]+/g, '\n') // 移除行首空格
      .replace(/[ \t]+\n/g, '\n') // 移除行尾空格

      // 特殊处理：确保图片后面有正确的段落分隔
      .replace(/(!\[[^\]]*\]\([^)]*\))([^\n])/g, '$1\n\n$2') // 图片后直接跟文字
      .replace(/(!\[[^\]]*\]\([^)]*\))\n([^\n])/g, '$1\n\n$2') // 图片后只有一个换行

      .replace(/\n{3,}/g, '\n\n') // 最多保留两个连续换行
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2') // 单换行变双换行
      .replace(/\n{3,}/g, '\n\n') // 再次清理
      .trim();

    return markdown;
  };

  // 处理粘贴事件
  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const htmlContent = clipboardData.getData('text/html');
    const textContent = clipboardData.getData('text/plain');
    
    // 优先使用HTML内容，如果没有则使用纯文本
    const content = htmlContent || textContent;
    setRawContent(content);
    
    // 如果检测到飞书内容，自动解析
    if (htmlContent && isFeishuContent(htmlContent)) {
      parseFeishuContent(htmlContent);
    }
  };

  // 手动解析
  const handleManualParse = () => {
    if (rawContent.trim()) {
      parseFeishuContent(rawContent);
    }
  };

  // 确认导入
  const handleConfirmImport = () => {
    onImport(extractedTitle, previewContent);
    handleClose();
  };

  // 关闭弹框
  const handleClose = () => {
    setRawContent('');
    setPreviewContent('');
    setExtractedTitle('');
    setShowPreview(false);
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
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              导入飞书文档
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              从飞书文档复制内容，自动转换为 Markdown 格式
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 主体内容 */}
        <div className="flex gap-4 h-96 p-6">
          {/* 左侧：粘贴区域 */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">粘贴飞书内容</label>
              {rawContent && !showPreview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualParse}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  解析内容
                </Button>
              )}
            </div>
            
            <Textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="请在飞书文档中复制内容，然后在此处粘贴...

💡 提示：
1. 在飞书文档中选择要导入的内容
2. 使用 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制
3. 在此处粘贴，系统会自动检测并转换格式"
              className="flex-1 resize-none font-mono text-sm"
            />
            
            {rawContent && isFeishuContent(rawContent) && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-blue-700">检测到飞书文档内容</span>
              </div>
            )}
          </div>

          {/* 右侧：预览区域 */}
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium mb-2">Markdown 预览</label>
            
            {isProcessing ? (
              <div className="flex-1 flex items-center justify-center border rounded">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-gray-500">正在解析内容...</p>
                </div>
              </div>
            ) : showPreview ? (
              <div className="flex-1 border rounded overflow-auto">
                {extractedTitle && (
                  <div className="p-3 border-b bg-gray-50">
                    <label className="text-xs text-gray-500">提取的标题：</label>
                    <p className="font-medium">{extractedTitle}</p>
                  </div>
                )}
                <div className="p-3">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {previewContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border rounded bg-gray-50">
                <div className="text-center text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">粘贴内容后将显示预览</p>
                </div>
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
            onClick={handleConfirmImport}
            disabled={!showPreview || !previewContent.trim()}
          >
            导入到编辑器
          </Button>
        </div>
      </div>
    </div>
  );
}
