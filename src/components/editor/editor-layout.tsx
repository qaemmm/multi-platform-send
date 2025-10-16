'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MultiPlatformEditor } from './multi-platform-editor';
import { PlatformPreview } from './platform-preview';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FileText,
  Upload,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { countWords, calculateReadingTime } from '@/lib/utils';
import { FeishuImportDialog } from './feishu-import-dialog';

export type Platform = 'wechat' | 'zhihu' | 'juejin' | 'zsxq';

interface EditorLayoutProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => Promise<void>;
}

export function EditorLayout({
  initialTitle = '',
  initialContent = '',
  onSave
}: EditorLayoutProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFeishuImport, setShowFeishuImport] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false, message: '', type: 'success'
  });

  const pathname = usePathname();
  const draftKey = useMemo(() => `ziliu:draft:${pathname || 'unknown'}`, [pathname]);
  const saveTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // 处理编辑器内容变化
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  // 计算统计信息
  const wordCount = countWords(content);
  const readingTime = calculateReadingTime(content);

  // 保存文章
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showToast('请填写标题和内容', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(title, content);
        // 清理对应草稿
        try { if (typeof window !== 'undefined') localStorage.removeItem(draftKey); } catch { }
        setLastSaved(new Date());
        showToast('保存成功', 'success');
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 处理飞书导入
  const handleFeishuImport = (importedTitle: string, importedContent: string) => {
    if (importedTitle && !title.trim()) {
      setTitle(importedTitle);
    }
    if (importedContent) {
      setContent(importedContent);
    }
  };

  // 本地自动保存：2秒防抖写入 localStorage；首次挂载尝试恢复
  useEffect(() => {
    // 首次挂载时尝试恢复草稿
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
        if (raw) {
          const draft = JSON.parse(raw) as { title?: string; content?: string; ts?: number };
          const hasDifferent = (draft.title ?? '') !== (initialTitle ?? '') || (draft.content ?? '') !== (initialContent ?? '');
          if (hasDifferent) {
            const shouldRestore = window.confirm('检测到未保存的草稿，是否恢复？');
            if (shouldRestore) {
              if (typeof draft.title === 'string') setTitle(draft.title);
              if (typeof draft.content === 'string') setContent(draft.content);
            }
          }
        }
      } catch (e) {
        console.warn('读取草稿失败:', e);
      }
    }

    // 变更后开启防抖保存
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          const payload = JSON.stringify({ title, content, ts: Date.now() });
          localStorage.setItem(draftKey, payload);
        }
      } catch (e) {
        console.warn('写入草稿失败:', e);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [title, content, draftKey, initialTitle, initialContent]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toast 提示 */}
      {toast.visible && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-sm ${toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-red-50 border-red-200 text-red-700'
            }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : toast.type === 'info' ? (
            <Info className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 顶部工具栏 */}
      <div className="border-b bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 左侧：返回和统计 */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  返回工作台
                </Button>
              </Link>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                <span>{wordCount} 字</span>
                <span>·</span>
                <span>预计阅读 {readingTime} 分钟</span>
                {lastSaved && (
                  <>
                    <span>·</span>
                    <span className="text-gray-400">
                      上次保存: {lastSaved.toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 右侧：功能按钮 */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeishuImport(true)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Upload className="h-4 w-4 mr-1" />
                导入飞书
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 左右分栏布局 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 主编辑区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：编辑器 */}
          <div className="w-1/2 border-r border-gray-200">
            <MultiPlatformEditor
              title={title}
              content={content}
              onTitleChange={handleTitleChange}
              onContentChange={handleContentChange}
            />
          </div>

          {/* 右侧：预览区域 */}
          <div className="w-1/2 bg-gray-50">
            <PlatformPreview
              title={title}
              content={content}
            />
          </div>
        </div>

      </div>

      {/* 飞书导入弹框 */}
      <FeishuImportDialog
        open={showFeishuImport}
        onOpenChange={setShowFeishuImport}
        onImport={handleFeishuImport}
        onShowToast={showToast}
      />
    </div>
  );
}
