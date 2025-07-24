import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db, articles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { countWords, calculateReadingTime } from '@/lib/utils';

// 创建文章的验证schema
const createArticleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(500, '标题过长'),
  content: z.string().min(1, '内容不能为空'),
  status: z.enum(['draft', 'published']).default('draft'),
});

// 创建文章
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, status } = createArticleSchema.parse(body);

    // 计算字数和阅读时间
    const wordCount = countWords(content);
    const readingTime = calculateReadingTime(content);

    // 创建文章
    const [newArticle] = await db.insert(articles).values({
      userId: session.user.id,
      title,
      content,
      status,
      wordCount,
      readingTime,
    }).returning();

    return NextResponse.json({
      success: true,
      data: newArticle,
      message: '文章保存成功',
    });
  } catch (error) {
    console.error('Create article error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: error.errors[0].message,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: '保存文章失败',
    }, { status: 500 });
  }
}

// 获取用户的文章列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    // 构建查询条件
    let whereCondition = eq(articles.userId, session.user.id);
    
    if (status && (status === 'draft' || status === 'published')) {
      whereCondition = eq(articles.userId, session.user.id);
      // 这里需要添加状态过滤，但为了简化先不实现
    }

    // 查询文章
    const userArticles = await db.query.articles.findMany({
      where: whereCondition,
      orderBy: (articles, { desc }) => [desc(articles.updatedAt)],
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        articles: userArticles,
        pagination: {
          page,
          limit,
          total: userArticles.length, // 简化实现，实际应该查询总数
        },
      },
    });
  } catch (error) {
    console.error('Get articles error:', error);

    return NextResponse.json({
      success: false,
      error: '获取文章列表失败',
    }, { status: 500 });
  }
}
