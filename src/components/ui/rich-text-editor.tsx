'use client';

import { useState } from 'react';
import { Bold, Italic, Link, Image, List, ListOrdered, Quote } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('rich-text-area') as HTMLTextAreaElement;
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

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    
    const imageHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; margin: 8px 0;" />`;
    insertText(imageHtml);
    
    setImageUrl('');
    setImageAlt('');
    setShowImageDialog(false);
  };

  const toolbarButtons = [
    {
      icon: Bold,
      title: '粗体',
      action: () => insertText('<strong>', '</strong>')
    },
    {
      icon: Italic,
      title: '斜体',
      action: () => insertText('<em>', '</em>')
    },
    {
      icon: Link,
      title: '链接',
      action: () => {
        const url = prompt('请输入链接地址:');
        if (url) {
          insertText(`<a href="${url}" target="_blank">`, '</a>');
        }
      }
    },
    {
      icon: Image,
      title: '插入图片',
      action: () => setShowImageDialog(true)
    },
    {
      icon: List,
      title: '无序列表',
      action: () => insertText('<ul>\n<li>', '</li>\n</ul>')
    },
    {
      icon: ListOrdered,
      title: '有序列表',
      action: () => insertText('<ol>\n<li>', '</li>\n</ol>')
    },
    {
      icon: Quote,
      title: '引用',
      action: () => insertText('<blockquote>', '</blockquote>')
    }
  ];

  const commonTemplates = [
    {
      name: '个人介绍',
      content: `<div style="border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px; background: #f9f9f9;">
<h4>👋 关于作者</h4>
<p>我是 <strong>你的名字</strong>，专注于...</p>
<p>📧 联系我：your-email@example.com</p>
<p>🔗 个人网站：<a href="https://your-website.com" target="_blank">your-website.com</a></p>
</div>`
    },
    {
      name: '产品推广',
      content: `<div style="border: 2px solid #4f46e5; padding: 16px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
<h4>🚀 产品推荐</h4>
<p>我们的产品可以帮助你...</p>
<p><a href="https://your-product.com" target="_blank" style="color: #fbbf24; font-weight: bold;">👉 立即体验</a></p>
</div>`
    },
    {
      name: '社群邀请',
      content: `<div style="border: 1px solid #10b981; padding: 16px; border-radius: 8px; background: #ecfdf5;">
<h4>🎯 加入我们的社群</h4>
<p>与更多志同道合的朋友一起交流学习</p>
<p>微信群：添加微信 <strong>your-wechat</strong> 备注"入群"</p>
</div>`
    }
  ];

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* 输入区域 */}
        <div className="border-r border-gray-200">
          <textarea
            id="rich-text-area"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-64 p-3 border-0 resize-none focus:outline-none font-mono text-sm"
          />
        </div>

        {/* 预览区域 */}
        <div className="p-3 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">预览效果：</div>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">在左侧输入内容，这里会显示预览效果</p>' }}
          />
        </div>
      </div>

      {/* 图片插入对话框 */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">插入图片</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片链接 *
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图片描述（可选）
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="图片描述"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowImageDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={insertImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                插入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 帮助提示 */}
      <div className="border-t border-gray-200 p-2 text-xs text-gray-500">
        💡 支持HTML标签：&lt;p&gt;、&lt;strong&gt;、&lt;em&gt;、&lt;a&gt;、&lt;img&gt;、&lt;ul&gt;、&lt;ol&gt;、&lt;li&gt;、&lt;blockquote&gt; 等
      </div>
    </div>
  );
}
