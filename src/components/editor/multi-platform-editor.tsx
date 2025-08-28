'use client';

import { useState, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { EditorToolbar } from './editor-toolbar';


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
  const handleImageUploadError = useCallback((error: string) => {
    console.error('图片上传失败:', error);
  }, []);

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

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      showToast('请拖拽图片文件', 'error');
      return;
    }

    for (const file of imageFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          handleImageUpload(data.data.url, file.name);
        } else {
          throw new Error(data.error || '上传失败');
        }
      } catch (error) {
        handleImageUploadError(error instanceof Error ? error.message : '上传失败');
      }
    }
  }, [handleImageUpload, handleImageUploadError]);

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
          showToast('飞书内容导入成功！', 'success');
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
      e.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          if (data.success) {
            handleImageUpload(data.data.url, `pasted-image-${Date.now()}.png`);
          } else {
            throw new Error(data.error || '上传失败');
          }
        } catch (error) {
          handleImageUploadError(error instanceof Error ? error.message : '上传失败');
        }
      }
    }
  }, [handleImageUpload, handleImageUploadError, onContentChange]);





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
    </div>
  );
}
