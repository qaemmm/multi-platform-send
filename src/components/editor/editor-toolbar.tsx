'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from './image-upload';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table,
} from 'lucide-react';

interface EditorToolbarProps {
  onInsertText: (text: string, cursorOffset?: number) => void;
  onImageUpload: (url: string, fileName: string) => void;
  onImageUploadError: (error: string, upgradeRequired?: boolean) => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  disabled?: boolean;
}

export function EditorToolbar({
  onInsertText,
  onImageUpload,
  onImageUploadError,
  showPreview,
  onTogglePreview,
  disabled = false
}: EditorToolbarProps) {

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            insertMarkdown('**', '**', '粗体文字');
            break;
          case 'i':
            e.preventDefault();
            insertMarkdown('*', '*', '斜体文字');
            break;
          case 'k':
            e.preventDefault();
            insertLink();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 插入文本的辅助函数
  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    if (placeholder) {
      onInsertText(`${before}${placeholder}${after}`, before.length);
    } else {
      onInsertText(`${before}${after}`, before.length);
    }
  };

  // 插入链接
  const insertLink = () => {
    const url = prompt('请输入链接地址:');
    if (url) {
      const text = prompt('请输入链接文字:') || '链接文字';
      onInsertText(`[${text}](${url})`);
    }
  };

  // 插入表格
  const insertTable = () => {
    const tableMarkdown = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |
| 内容4 | 内容5 | 内容6 |
`;
    onInsertText(tableMarkdown.trim());
  };

  // 工具栏按钮组
  const toolbarGroups = [
    // 文本格式组
    {
      name: '文本格式',
      buttons: [
        {
          icon: Bold,
          title: '粗体 (Ctrl+B)',
          action: () => insertMarkdown('**', '**', '粗体文字'),
        },
        {
          icon: Italic,
          title: '斜体 (Ctrl+I)',
          action: () => insertMarkdown('*', '*', '斜体文字'),
        },
        {
          icon: Strikethrough,
          title: '删除线',
          action: () => insertMarkdown('~~', '~~', '删除线文字'),
        },
        {
          icon: Code,
          title: '行内代码',
          action: () => insertMarkdown('`', '`', '代码'),
        },
      ],
    },
    // 标题组
    {
      name: '标题',
      buttons: [
        {
          icon: Heading1,
          title: '一级标题',
          action: () => insertMarkdown('# ', '', '一级标题'),
        },
        {
          icon: Heading2,
          title: '二级标题',
          action: () => insertMarkdown('## ', '', '二级标题'),
        },
        {
          icon: Heading3,
          title: '三级标题',
          action: () => insertMarkdown('### ', '', '三级标题'),
        },
      ],
    },
    // 列表和引用组
    {
      name: '列表',
      buttons: [
        {
          icon: List,
          title: '无序列表',
          action: () => insertMarkdown('- ', '', '列表项'),
        },
        {
          icon: ListOrdered,
          title: '有序列表',
          action: () => insertMarkdown('1. ', '', '列表项'),
        },
        {
          icon: Quote,
          title: '引用',
          action: () => insertMarkdown('> ', '', '引用内容'),
        },
      ],
    },
    // 媒体和链接组
    {
      name: '媒体',
      buttons: [
        {
          icon: Link,
          title: '插入链接',
          action: insertLink,
        },
        {
          icon: Table,
          title: '插入表格',
          action: insertTable,
        },
      ],
    },
  ];

  return (
    <div className="border-b bg-white px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {toolbarGroups.map((group, groupIndex) => (
            <div key={group.name} className="flex items-center">
              {groupIndex > 0 && (
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
              )}
              <div className="flex items-center space-x-1">
                {group.buttons.map((button, buttonIndex) => (
                  <Button
                    key={buttonIndex}
                    variant="ghost"
                    size="sm"
                    onClick={button.action}
                    disabled={disabled}
                    title={button.title}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <button.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* 图片上传 */}
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          <ImageUpload
            onUpload={onImageUpload}
            onError={onImageUploadError}
            disabled={disabled}
            className="h-8"
          />

          {/* 代码块 */}
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('```\n', '\n```', '代码内容')}
            disabled={disabled}
            title="代码块"
            className="h-8 px-2 hover:bg-gray-100 text-xs"
          >
            代码块
          </Button>

          {/* 分割线 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('\n---\n')}
            disabled={disabled}
            title="分割线"
            className="h-8 px-2 hover:bg-gray-100 text-xs"
          >
            分割线
          </Button>
        </div>


      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-xs text-gray-500 border-t pt-2">
        <span>💡 快捷键：</span>
        <span className="ml-2">Ctrl+B 粗体</span>
        <span className="ml-2">Ctrl+I 斜体</span>
        <span className="ml-2">Ctrl+K 链接</span>
        <span className="ml-2">拖拽图片到编辑器可直接上传</span>
      </div>
    </div>
  );
}
