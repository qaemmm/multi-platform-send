import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await registerUser(body);
    
    return NextResponse.json({
      success: true,
      data: user,
      message: '注册成功',
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '注册失败',
    }, { status: 400 });
  }
}
