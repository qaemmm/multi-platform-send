'use client';

import { useState, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { EditorToolbar } from './editor-toolbar';
import { useImageUploadService } from '@/lib/services/imageUploadService';
import { UpgradePrompt } from '@/lib/subscription/components/UpgradePrompt';


interface EditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

export function MultiPlatformEditor({
  title,
  content,
  onTitleChange,
  onContentChange
}: EditorProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });
  const [showImageUpgradePrompt, setShowImageUpgradePrompt] = useState(false);
  
  // 使用统一的图片上传服务
  const imageUploadService = useImageUploadService();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
  };





  // 处理图片上传成功
  const handleImageUpload = useCallback((url: string, fileName: string) => {
    const markdownImage = `![${fileName}](${url})`;
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + markdownImage + content.slice(end);
      onContentChange(newContent);
      setTimeout(() => {
        textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
        textarea.focus();
      }, 0);
    } else {
      onContentChange(content + '\n\n' + markdownImage);
    }
  }, [content, onContentChange]);

  // 处理图片上传错误
  const handleImageUploadError = useCallback((error: string, upgradeRequired?: boolean) => {
    console.error('图片上传失败:', error);
    if (upgradeRequired) {
      // 显示专业的订阅引导弹窗
      setShowImageUpgradePrompt(true);
    } else {
      showToast(error, 'error');
    }
  }, [showToast]);

  // 插入文本到编辑器
  const handleInsertText = useCallback((text: string, cursorOffset?: number) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + text + content.slice(end);
      onContentChange(newContent);

      setTimeout(() => {
        const newCursorPos = cursorOffset !== undefined
          ? start + cursorOffset
          : start + text.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    } else {
      onContentChange(content + text);
    }
  }, [content, onContentChange]);



  // 处理拖拽文件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    // 使用统一的图片上传服务
    const results = await imageUploadService.uploadFromDrop(e.nativeEvent, {
      onSuccess: (result) => {
        if (result.data) {
          handleImageUpload(result.data.url, result.data.fileName);
        }
      },
      onError: (error, upgradeRequired) => {
        handleImageUploadError(error, upgradeRequired);
      }
    });

    // 处理批量结果
    results.forEach(result => {
      if (result.success && result.data) {
        handleImageUpload(result.data.url, result.data.fileName);
      } else if (!result.success) {
        handleImageUploadError(result.error || '上传失败', result.upgradeRequired);
      }
    });
  }, [imageUploadService, handleImageUpload, handleImageUploadError]);

  // 检测是否为飞书内容
  const isFeishuContent = (content: string): boolean => {
    const feishuIndicators = [
      'data-lake-id',
      'lark-record-data',
      'feishu.cn',
      'larksuite.com',
      'data-card-value'
    ];
    return feishuIndicators.some(indicator => content.includes(indicator));
  };

  // 处理粘贴内容（图片和飞书内容）
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    const htmlContent = clipboardData.getData('text/html');
    const textContent = clipboardData.getData('text/plain');
    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    console.log('🎯 粘贴事件触发');
    console.log('📋 剪贴板项目:', items.map(i => ({ type: i.type, kind: i.kind })));
    console.log('🖼️ 图片项目数量:', imageItems.length);
    console.log('📄 HTML内容长度:', htmlContent?.length || 0);
    console.log('📝 文本内容长度:', textContent?.length || 0);

    // 优先处理飞书HTML内容
    if (htmlContent && isFeishuContent(htmlContent)) {
      e.preventDefault();

      try {
        showToast('正在处理飞书内容...', 'info');

        const response = await fetch('/api/parse-feishu', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: htmlContent }),
        });

        const data = await response.json();

        if (data.success) {
          // 直接替换编辑器内容
          onContentChange(data.markdown);
          
          // 检查是否有图片警告
          if (data.imageWarning) {
            showToast(`飞书内容导入成功！${data.imageWarning}`, 'info');
          } else {
            showToast('飞书内容导入成功！', 'success');
          }
        } else {
          throw new Error(data.error || '解析失败');
        }
      } catch (error) {
        console.error('飞书内容解析失败:', error);
        showToast('飞书内容解析失败，请重试', 'error');
      }
      return;
    }

    // 处理图片粘贴
    if (imageItems.length > 0) {
      console.log('✅ 检测到图片，开始上传流程');
      e.preventDefault();

      showToast(`正在上传 ${imageItems.length} 张图片...`, 'info');

      // 使用统一的图片上传服务
      const results = await imageUploadService.uploadFromPaste(e.nativeEvent, {
        onSuccess: (result) => {
          console.log('✅ 图片上传成功:', result.data?.fileName);
          if (result.data) {
            handleImageUpload(result.data.url, result.data.fileName);
            showToast(`图片 ${result.data.fileName} 上传成功`, 'success');
          }
        },
        onError: (error, upgradeRequired) => {
          console.error('❌ 图片上传失败:', error);
          handleImageUploadError(error, upgradeRequired);
        }
      });

      console.log('📊 上传结果:', results);

      // 处理批量结果
      results.forEach(result => {
        if (result.success && result.data) {
          handleImageUpload(result.data.url, result.data.fileName);
        } else if (!result.success) {
          handleImageUploadError(result.error || '上传失败', result.upgradeRequired);
        }
      });
    } else {
      console.log('ℹ️ 没有检测到图片，使用默认粘贴行为');
    }
  }, [handleImageUpload, handleImageUploadError, onContentChange, imageUploadService]);





  return (
    <div className="h-full flex flex-col bg-white">
      {/* 编辑器区域 */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* 拖拽覆盖层 */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-10 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 shadow-lg border border-blue-200">
              <div className="text-center">
                <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-700">释放以上传图片</p>
              </div>
            </div>
          </div>
        )}

        {/* 标题输入 */}
        <div className="p-6 border-b border-gray-100">
          <Input
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
            }}
            placeholder="请输入文章标题..."
            className="text-xl font-semibold border-none px-0 focus-visible:ring-0 placeholder:text-gray-400"
          />
        </div>

        {/* 编辑器工具栏 */}
        <EditorToolbar
          onInsertText={handleInsertText}
          onImageUpload={handleImageUpload}
          onImageUploadError={handleImageUploadError}
        />

        {/* 内容编辑器 */}
        <div
          className="flex-1 p-6"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Textarea
            value={content}
            onChange={(e) => {
              onContentChange(e.target.value);
            }}
            onPaste={handlePaste}
            placeholder={`请输入Markdown内容...

# 示例标题

这是一个段落示例。

## 二级标题

- 列表项1
- 列表项2

\`\`\`javascript
console.log('代码示例');
\`\`\`

> 这是一个引用块

💡 提示：
- 可以直接拖拽图片到编辑器
- 可以粘贴剪贴板中的图片
- 点击工具栏的「上传图片」按钮选择文件`}
            className="h-full resize-none border-none px-0 focus-visible:ring-0 font-mono text-sm placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Toast 通知 */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg border
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
            ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
          `}>
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="h-4 w-4 flex-shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* 图片超限订阅引导弹窗 */}
      {showImageUpgradePrompt && (
        <UpgradePrompt 
          scenario="cloud-images-limit" 
          style="modal"
          onClose={() => setShowImageUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
