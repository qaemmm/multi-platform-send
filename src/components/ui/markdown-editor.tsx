'use client';

import { useState } from 'react';
import { Bold, Italic, Link, Image, List, ListOrdered, Quote, Eye, Edit3 } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, className = '', label }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    {
      icon: Bold,
      title: '粗体',
      action: () => insertText('**', '**')
    },
    {
      icon: Italic,
      title: '斜体',
      action: () => insertText('*', '*')
    },
    {
      icon: Link,
      title: '链接',
      action: () => {
        const url = prompt('请输入链接地址:');
        const text = prompt('请输入链接文字:') || '链接';
        if (url) {
          insertText(`[${text}](${url})`);
        }
      }
    },
    {
      icon: Image,
      title: '图片',
      action: () => {
        const url = prompt('请输入图片地址:');
        const alt = prompt('请输入图片描述:') || '图片';
        if (url) {
          insertText(`![${alt}](${url})`);
        }
      }
    },
    {
      icon: List,
      title: '无序列表',
      action: () => insertText('- ')
    },
    {
      icon: ListOrdered,
      title: '有序列表',
      action: () => insertText('1. ')
    },
    {
      icon: Quote,
      title: '引用',
      action: () => insertText('> ')
    }
  ];

  const commonTemplates = [
    {
      name: '个人介绍',
      content: `> 👋 **关于作者**
> 
> 我是 **你的名字**，专注于前端技术分享
> 
> 📧 联系我：your-email@example.com  
> 🔗 个人网站：[your-website.com](https://your-website.com)`
    },
    {
      name: '产品推广',
      content: `---

🚀 **产品推荐**

我们的产品可以帮助你提升工作效率...

[👉 立即体验](https://your-product.com)`
    },
    {
      name: '社群邀请',
      content: `---

🎯 **加入我们的社群**

与更多志同道合的朋友一起交流学习

微信群：添加微信 **your-wechat** 备注"入群"`
    },
    {
      name: '精选文章',
      content: `{{featured-articles:5}}

*以上是系统智能推荐的相关文章*`
    }
  ];

  // 简单的Markdown转HTML
  const markdownToHtml = (markdown: string) => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^1\. (.+)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n/g, '<br>')
      .replace(/{{featured-articles:(\d+)}}/g, '<div style="border: 2px dashed #3b82f6; padding: 12px; border-radius: 8px; background: #eff6ff; color: #1d4ed8;"><strong>📚 精选文章推荐 (显示$1篇)</strong><br><small>插件会智能匹配相关文章并插入到此位置</small></div>');
  };

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* 标题和切换按钮 */}
      {label && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${!showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Edit3 className="w-3 h-3" />
              编辑
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded ${showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Eye className="w-3 h-3" />
              预览
            </button>
          </div>
        </div>
      )}

      {!showPreview ? (
        <>
          {/* 工具栏 */}
          <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
            {toolbarButtons.map((button, index) => (
              <button
                key={index}
                type="button"
                onClick={button.action}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </button>
            ))}
            
            {/* 模板选择 */}
            <div className="ml-auto">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    const template = commonTemplates.find(t => t.name === e.target.value);
                    if (template) {
                      onChange(value + '\n\n' + template.content);
                    }
                    e.target.value = '';
                  }
                }}
                className="text-xs px-2 py-1 border border-gray-300 rounded"
              >
                <option value="">插入模板</option>
                {commonTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 编辑区域 */}
          <textarea
            id="markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-48 p-3 border-0 resize-none focus:outline-none font-mono text-sm"
          />
        </>
      ) : (
        /* 预览区域 */
        <div className="p-3 min-h-48">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: value ? markdownToHtml(value) : '<p class="text-gray-400">暂无内容</p>' 
            }}
          />
        </div>
      )}

      {/* 帮助提示 */}
      <div className="border-t border-gray-200 p-2 text-xs text-gray-500">
        💡 支持Markdown语法：**粗体**、*斜体*、[链接](url)、![图片](url)、&gt; 引用、- 列表等
        {!showPreview && ' | 精选文章占位符：{{featured-articles:数量}}'}
      </div>
    </div>
  );
}
