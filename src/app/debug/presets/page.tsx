'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PresetDebugInfo {
  id: string;
  name: string;
  platform: string;
  isDefault: boolean;
  hasHeaderContent: boolean;
  hasFooterContent: boolean;
  headerContentLength: number;
  footerContentLength: number;
}

interface DebugData {
  totalPresets: number;
  platformDistribution: Record<string, number>;
  presetsWithoutPlatform: number;
  presetsWithContent: number;
  zhihuPresets: any[];
  allPresets: PresetDebugInfo[];
}

export default function PresetsDebugPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fixingPreset, setFixingPreset] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchDebugData();
    }
  }, [status, router]);

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/presets/debug');
      const data = await response.json();

      if (data.success) {
        setDebugData(data.data);
      } else {
        setError(data.error || '获取调试数据失败');
      }
    } catch (error) {
      console.error('获取调试数据失败:', error);
      setError('获取调试数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fixPresetPlatform = async (presetId: string, newPlatform: string) => {
    try {
      setFixingPreset(presetId);
      const response = await fetch('/api/presets/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presetId,
          newPlatform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 重新获取数据
        await fetchDebugData();
        alert(`预设平台已更新为 ${newPlatform}`);
      } else {
        alert(data.error || '修复失败');
      }
    } catch (error) {
      console.error('修复预设失败:', error);
      alert('修复预设失败');
    } finally {
      setFixingPreset(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDebugData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">预设数据调试</h1>
          <p className="mt-2 text-gray-600">检查和修复预设数据的平台字段问题</p>
        </div>

        {debugData && (
          <>
            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">总预设数</h3>
                <p className="text-3xl font-bold text-blue-600">{debugData.totalPresets}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">有内容的预设</h3>
                <p className="text-3xl font-bold text-green-600">{debugData.presetsWithContent}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">知乎预设数</h3>
                <p className="text-3xl font-bold text-purple-600">{debugData.zhihuPresets.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900">无平台字段</h3>
                <p className="text-3xl font-bold text-red-600">{debugData.presetsWithoutPlatform}</p>
              </div>
            </div>

            {/* 平台分布 */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">平台分布</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(debugData.platformDistribution).map(([platform, count]) => (
                  <div key={platform} className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">{platform}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 预设列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">所有预设详情</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        预设名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        平台
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        默认
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        开头内容
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        结尾内容
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugData.allPresets.map((preset) => (
                      <tr key={preset.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {preset.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            preset.platform === 'zhihu' ? 'bg-blue-100 text-blue-800' :
                            preset.platform === 'juejin' ? 'bg-cyan-100 text-cyan-800' :
                            preset.platform === 'wechat' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {preset.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {preset.isDefault ? '✅' : '❌'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {preset.hasHeaderContent ? `✅ (${preset.headerContentLength}字)` : '❌'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {preset.hasFooterContent ? `✅ (${preset.footerContentLength}字)` : '❌'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {preset.platform !== 'zhihu' && (
                              <button
                                onClick={() => fixPresetPlatform(preset.id, 'zhihu')}
                                disabled={fixingPreset === preset.id}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {fixingPreset === preset.id ? '修复中...' : '改为知乎'}
                              </button>
                            )}
                            {preset.platform !== 'juejin' && (
                              <button
                                onClick={() => fixPresetPlatform(preset.id, 'juejin')}
                                disabled={fixingPreset === preset.id}
                                className="px-3 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50"
                              >
                                {fixingPreset === preset.id ? '修复中...' : '改为掘金'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
