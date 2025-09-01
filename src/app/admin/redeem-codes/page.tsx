'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Copy, Calendar, Clock } from 'lucide-react';

interface RedeemCode {
  id: string;
  code: string;
  type: 'monthly' | 'yearly';
  duration: number;
  isUsed: boolean;
  usedByUser?: {
    id: string;
    name: string;
    email: string;
  };
  usedAt?: string;
  note: string;
  createdAt: string;
}

export default function AdminRedeemCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [generateType, setGenerateType] = useState<'monthly' | 'yearly'>('monthly');
  const [generateNote, setGenerateNote] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    loadCodes();
  }, [session, status, router]);

  const loadCodes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/redeem-codes');
      const data = await response.json();
      
      if (data.success) {
        setCodes(data.data.codes);
      } else if (data.error === '权限不足') {
        alert('你没有管理员权限');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('加载兑换码失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCodes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/redeem-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: generateType,
          count: generateCount,
          note: generateNote || `${generateType === 'monthly' ? '月卡' : '年卡'}-${new Date().toLocaleDateString()}`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setGenerateCount(1);
        setGenerateNote('');
        loadCodes(); // 重新加载列表
      } else {
        alert(data.error || '生成失败');
      }
    } catch (error) {
      console.error('生成兑换码失败:', error);
      alert('生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('兑换码已复制到剪贴板');
  };

  if (status === 'loading') {
    return <div className="p-8">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">兑换码管理</h1>
          <p className="text-gray-600">生成和管理专业版兑换码</p>
        </div>

        {/* 生成兑换码 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="h-5 w-5 mr-2" />
              生成兑换码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类型
                </label>
                <select
                  value={generateType}
                  onChange={(e) => setGenerateType(e.target.value as 'monthly' | 'yearly')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="monthly">月卡 (1个月)</option>
                  <option value="yearly">年卡 (12个月)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数量
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注
                </label>
                <Input
                  placeholder="可选：批次备注信息"
                  value={generateNote}
                  onChange={(e) => setGenerateNote(e.target.value)}
                />
              </div>
            </div>
            
            <Button
              onClick={generateCodes}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Gift className="h-4 w-4 mr-2" />
              生成 {generateCount} 个{generateType === 'monthly' ? '月卡' : '年卡'}
            </Button>
          </CardContent>
        </Card>

        {/* 兑换码列表 */}
        <Card>
          <CardHeader>
            <CardTitle>兑换码列表</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">加载中...</p>
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无兑换码
              </div>
            ) : (
              <div className="space-y-3">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className={`p-4 rounded-lg border ${
                      code.isUsed ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          code.type === 'yearly'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {code.type === 'yearly' ? (
                            <>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              年卡
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 inline mr-1" />
                              月卡
                            </>
                          )}
                        </div>
                        
                        <div>
                          <div className="font-mono text-lg font-bold text-gray-900">
                            {code.code}
                          </div>
                          <div className="text-sm text-gray-500">
                            {code.note} · 创建于 {new Date(code.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {code.isUsed ? (
                          <div className="text-sm text-gray-500">
                            <div>已使用</div>
                            {code.usedByUser && (
                              <div>用户: {code.usedByUser.name}</div>
                            )}
                            {code.usedAt && (
                              <div>{new Date(code.usedAt).toLocaleDateString('zh-CN')}</div>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            复制
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}