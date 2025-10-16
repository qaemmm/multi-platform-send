/**
 * 内容处理服务 - 处理文章数据转换和格式化
 * 从 core/app.js 中移出的业务逻辑
 */
class ZiliuContentService {
  constructor() {
    console.log('🔧 内容处理服务初始化');
  }

  /**
   * 处理内容数据
   */
  async processContentData(data, currentPlatform, selectedPreset) {
    // 如果传入的是articleId，需要获取完整的文章数据
    if (data.articleId) {
      console.log('🔍 获取文章详情:', data.articleId);
      return await this.processArticleData(data, currentPlatform, selectedPreset);
    }

    // 直接使用传入的数据，但确保有预设信息
    return {
      ...data,
      preset: data.preset || selectedPreset
    };
  }

  /**
   * 处理文章数据
   */
  async processArticleData(data, currentPlatform, selectedPreset) {
    try {
      // 获取文章详情
      const articleDetail = await this.fetchArticleDetail(data.articleId);
      
      // 根据平台转换文章格式
      const platformId = currentPlatform?.id;
      const targetFormat = platformId === 'zhihu' ? 'zhihu' : 'wechat';
      
      console.log('🔄 转换文章格式:', targetFormat);
      const sourceContent = articleDetail.originalContent || articleDetail.content;
      console.log('🔍 源内容详情:', {
        hasOriginalContent: !!articleDetail.originalContent,
        hasContent: !!articleDetail.content,
        sourceLength: sourceContent?.length,
        sourcePreview: sourceContent?.substring(0, 100) + '...'
      });
      
      const convertedContent = await this.convertArticleFormat(
        sourceContent,
        targetFormat,
        articleDetail.style || 'default'
      );

      // 获取原始Markdown（用于特定平台）
      let originalMarkdown = '';
      try {
        const markdownData = await this.fetchArticleMarkdown(data.articleId);
        originalMarkdown = markdownData.content || '';
      } catch (error) {
        console.warn('获取原始Markdown失败，将使用HTML内容:', error);
      }

      // 获取预设信息
      const preset = data.preset || selectedPreset;
      
      // 构建完整的填充数据
      return {
        title: articleDetail.title,
        content: convertedContent,
        originalMarkdown: originalMarkdown,
        author: data.author || preset?.author,
        preset: preset
      };
    } catch (error) {
      console.error('❌ 处理文章数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取文章详情
   */
  async fetchArticleDetail(articleId) {
    const response = await ZiliuApiService.articles.get(articleId, 'inline');
    if (!response.success) {
      throw new Error(response.error || '获取文章详情失败');
    }
    return response.data;
  }

  /**
   * 转换文章格式
   */
  async convertArticleFormat(content, targetFormat, style = 'default') {
    const response = await ZiliuApiService.content.convert(content || '', targetFormat, style);
    
    if (!response.success) {
      throw new Error(response.error || '格式转换失败');
    }
    
    // 按照legacy的逻辑，返回inlineHtml字段
    if (response.data?.inlineHtml) {
      console.log('✅ 使用 convert API 生成内联样式 HTML');
      return response.data.inlineHtml;
    } else {
      console.warn('⚠️ convert API 返回格式异常，使用原始内容');
      return content; // 回退到原始内容
    }
  }

  /**
   * 获取文章Markdown
   */
  async fetchArticleMarkdown(articleId) {
    const response = await ZiliuApiService.articles.get(articleId, 'raw');
    if (!response.success) {
      throw new Error(response.error || '获取Markdown失败');
    }
    return response.data;
  }
}

// 全局内容服务实例
window.ZiliuContentService = new ZiliuContentService();