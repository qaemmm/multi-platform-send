'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, Plus, Star, Edit, Trash2 } from 'lucide-react';
import { Platform } from './multi-platform-editor';

interface Preset {
  id: string;
  name: string;
  isDefault?: boolean;
  headerContent?: string;
  footerContent?: string;
  authorName?: string;
  platform?: Platform;
}

interface PresetSelectorProps {
  platform: Platform;
  onApplyPreset: (preset: Preset) => void;
}

export function PresetSelector({ platform, onApplyPreset }: PresetSelectorProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 加载预设列表
  const loadPresets = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/presets');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // 过滤适用于当前平台的预设
        const filteredPresets = data.data.filter((preset: Preset) => 
          !preset.platform || preset.platform === platform
        );
        
        // 按默认预设和更新时间排序
        const sortedPresets = filteredPresets.sort((a: Preset, b: Preset) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return 0;
        });
        
        setPresets(sortedPresets);
        
        // 自动选择默认预设
        const defaultPreset = sortedPresets.find((p: Preset) => p.isDefault);
        if (defaultPreset) {
          setSelectedPresetId(defaultPreset.id);
        } else if (sortedPresets.length > 0) {
          setSelectedPresetId(sortedPresets[0].id);
        }
      }
    } catch (error) {
      console.error('加载预设失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, isLoading]);

  // 应用预设
  const handleApplyPreset = async () => {
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset) {
      alert('请选择一个预设');
      return;
    }

    setIsApplying(true);
    try {
      onApplyPreset(preset);
      setShowDropdown(false);
    } catch (error) {
      console.error('应用预设失败:', error);
      alert('应用预设失败，请重试');
    } finally {
      setIsApplying(false);
    }
  };

  // 获取平台图标
  const getPlatformIcon = (platform: Platform) => {
    const icons = {
      wechat: '📱',
      zhihu: '🔵',
      juejin: '⚡',
      zsxq: '🌟'
    };
    return icons[platform] || '📄';
  };

  // 获取平台名称
  const getPlatformName = (platform: Platform) => {
    const names = {
      wechat: '公众号',
      zhihu: '知乎',
      juejin: '掘金',
      zsxq: '知识星球'
    };
    return names[platform] || platform;
  };

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className="text-amber-700 border-amber-200 hover:bg-amber-50"
      >
        <Settings className="h-4 w-4 mr-1" />
        预设模板
      </Button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center">
                {getPlatformIcon(platform)}
                <span className="ml-2">{getPlatformName(platform)}预设</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDropdown(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">加载中...</span>
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📝</div>
                <p className="text-sm text-gray-500 mb-3">暂无预设模板</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 跳转到预设管理页面
                    window.open('/dashboard/presets', '_blank');
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  创建预设
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 预设列表 */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPresetId === preset.id
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPresetId(preset.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-sm text-gray-900">
                            {preset.name}
                          </div>
                          {preset.isDefault && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 跳转到预设编辑页面
                              window.open(`/dashboard/presets?edit=${preset.id}`, '_blank');
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('确定要删除这个预设吗？')) {
                                try {
                                  const response = await fetch(`/api/presets/${preset.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (response.ok) {
                                    // 重新加载预设列表
                                    loadPresets();
                                  } else {
                                    alert('删除失败，请重试');
                                  }
                                } catch (error) {
                                  console.error('删除预设失败:', error);
                                  alert('删除失败，请重试');
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {preset.authorName && (
                        <div className="text-xs text-gray-500 mt-1">
                          作者: {preset.authorName}
                        </div>
                      )}
                      
                      {(preset.headerContent || preset.footerContent) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {preset.headerContent && '包含开头模板'}
                          {preset.headerContent && preset.footerContent && ' · '}
                          {preset.footerContent && '包含结尾模板'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // 跳转到预设管理页面
                      window.open('/dashboard/presets', '_blank');
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    新建预设
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleApplyPreset}
                    disabled={isApplying || !selectedPresetId}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Settings className="h-4 w-4 mr-1" />
                    )}
                    应用预设
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
