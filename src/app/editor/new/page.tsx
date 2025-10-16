'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EditorLayout } from '@/components/editor/editor-layout';
import { useUserPlan } from '@/lib/subscription/hooks/useUserPlan';
import { ArticleCreationGuard } from '@/lib/subscription/components/FeatureGuard';

export default function NewEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { refreshUsage } = useUserPlan();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  const handleSave = async (title: string, content: string) => {
    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          status: 'draft',
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 保存成功，更新使用统计并跳转到编辑页面
        console.log('文章保存成功:', data.data);
        refreshUsage(); // 刷新文章数量统计
        router.push(`/editor/${data.data.id}`);
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存文章失败:', error);
      throw error;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <ArticleCreationGuard>
      <EditorLayout onSave={handleSave} />
    </ArticleCreationGuard>
  );
}
