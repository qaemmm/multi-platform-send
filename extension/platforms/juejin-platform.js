/**
 * 掘金平台处理器
 */
class JuejinPlatform extends BasePlatform {
  constructor() {
    super({
      name: 'juejin',
      displayName: '掘金',
      urlPatterns: ['*://juejin.cn/editor/*'],
      editorUrl: 'https://juejin.cn/editor/drafts/new?v=2'
    });
    
    // 掘金平台配置
    this.config = {
      supportsFill: false, // 不支持自动填充（和知乎一样）
      supportsPublish: false,
      supportsSchedule: false,
      supportsCopy: true, // 只支持复制功能
      supportsMarkdown: true // 支持Markdown格式
    };
  }

  /**
   * 查找掘金编辑器元素
   */
  findEditorElements() {
    console.log('🔍 掘金平台：查找编辑器元素');

    // 掘金平台简化检测：只要URL匹配就认为是编辑器页面（和知乎一样）
    const isJuejinEditor = this.urlPatterns.some(pattern =>
      new RegExp(pattern.replace(/\*/g, '.*')).test(window.location.href)
    );

    // 查找实际的编辑器元素（用于复制功能）
    let titleInput = null;
    let contentEditor = null;
    let publishButton = null;
    let categorySelector = null;
    let tagInput = null;
    let summaryTextarea = null;
    let codeMirrorInstance = null;

    if (isJuejinEditor) {
      // 查找标题输入框
      titleInput = document.querySelector('input[placeholder*="标题"]') ||
                  document.querySelector('input.title-input') ||
                  document.querySelector('.title-input');

      // 查找内容编辑器
      contentEditor = document.querySelector('.CodeMirror') ||
                     document.querySelector('.bytemd-editor .CodeMirror') ||
                     document.querySelector('.markdown-editor .CodeMirror');

      // 查找CodeMirror实例
      if (contentEditor && contentEditor.CodeMirror) {
        codeMirrorInstance = contentEditor.CodeMirror;
      }

      // 查找发布按钮
      const publishButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
        btn.textContent && btn.textContent.includes('发布')
      );
      publishButton = publishButtons[0];

      // 查找其他元素
      categorySelector = document.querySelector('.category-list') ||
                        document.querySelector('.form-item-content.category-list');

      tagInput = document.querySelector('.byte-select__input') ||
                document.querySelector('input[placeholder*="标签"]');

      summaryTextarea = document.querySelector('.byte-input__textarea') ||
                       document.querySelector('textarea');
    }

    console.log('🔍 掘金编辑器检测结果:', {
      url: window.location.href,
      isEditor: isJuejinEditor,
      titleInput: !!titleInput,
      contentEditor: !!contentEditor,
      codeMirrorInstance: !!codeMirrorInstance,
      publishButton: !!publishButton
    });

    return {
      isJuejinEditor,
      isEditor: isJuejinEditor,
      titleInput,
      contentEditor,
      codeMirrorInstance,
      publishButton,
      categorySelector,
      tagInput,
      summaryTextarea,
      platform: 'juejin'
    };
  }

  /**
   * 等待编辑器加载（掘金平台简化版）
   */
  async waitForEditor() {
    console.log('🔍 掘金平台：等待编辑器加载');
    // 掘金平台只要URL匹配就认为编辑器已就绪（和知乎一样）
    return this.findEditorElements();
  }

  /**
   * 掘金平台不支持自动填充，只提供复制功能
   */
  async fillContent(data) {
    console.log('🔍 掘金平台：掘金平台不支持自动填充');
    return {
      success: false,
      error: '掘金平台暂不支持自动填充，请使用复制功能手动粘贴内容',
      showCopyOption: true
    };
  }



  /**
   * 处理特殊语法
   */
  async processSpecialSyntax(content) {
    let processedContent = content;

    // 处理精选文章语法 {{featured-articles:数量}}
    const featuredArticlesRegex = /\{\{featured-articles:(\d+)\}\}/g;
    let match;

    while ((match = featuredArticlesRegex.exec(content)) !== null) {
      const count = parseInt(match[1]) || 5;
      const placeholder = match[0];
      
      try {
        // 获取历史文章
        const articles = await this.fetchJuejinArticles(count);
        
        // 生成文章链接列表（Markdown格式）
        const articleLinks = articles.map(article => {
          return `- [${article.title}](${article.url})`;
        }).join('\n');
        
        // 替换占位符
        processedContent = processedContent.replace(placeholder, articleLinks);
      } catch (error) {
        console.error('获取历史文章失败:', error);
        processedContent = processedContent.replace(placeholder, `<!-- 获取历史文章失败: ${error.message} -->`);
      }
    }

    return processedContent;
  }

  /**
   * 获取掘金历史文章
   */
  async fetchJuejinArticles(count = 5) {
    // 这里可以实现获取掘金历史文章的逻辑
    // 暂时返回空数组
    console.log('🔍 掘金平台：获取历史文章功能待实现');
    return [];
  }

  /**
   * 复制内容到剪贴板（和知乎平台保持一致）
   */
  async copyContent(data) {
    try {
      console.log('🔍 掘金平台：开始复制内容', data);

      let contentToCopy = '';

      // 添加标题
      if (data.title) {
        contentToCopy += `# ${data.title}\n\n`;
      }

      // 优先使用原始Markdown内容
      if (data.originalMarkdown) {
        contentToCopy += data.originalMarkdown;
      } else if (data.content) {
        // 如果没有原始Markdown，使用HTML内容并简单转换
        contentToCopy += this.htmlToMarkdown(data.content);
      }

      // 添加发布预设的开头和结尾内容
      if (data.preset) {
        // 添加开头内容
        if (data.preset.headerContent) {
          console.log('🔍 掘金平台：添加发布预设的开头内容');
          contentToCopy = data.preset.headerContent + '\n\n' + contentToCopy;
        }

        // 添加结尾内容
        if (data.preset.footerContent) {
          console.log('🔍 掘金平台：添加发布预设的结尾内容');
          contentToCopy += '\n\n' + data.preset.footerContent;
        }
      }

      console.log('🔍 掘金平台：最终复制内容长度:', contentToCopy.length);

      // 复制到剪贴板
      await navigator.clipboard.writeText(contentToCopy);

      console.log('✅ 掘金平台：内容已复制到剪贴板');
      return {
        success: true,
        message: '内容已复制到剪贴板，请手动粘贴到掘金编辑器中'
      };

    } catch (error) {
      console.error('❌ 掘金平台：复制失败:', error);
      return {
        success: false,
        error: '复制失败: ' + error.message
      };
    }
  }

  /**
   * 简单的HTML转Markdown（和知乎平台保持一致）
   */
  htmlToMarkdown(html) {
    if (!html) return '';

    return html
      // 标题转换
      .replace(/<h([1-6])>(.*?)<\/h[1-6]>/gi, (_, level, text) => '#'.repeat(parseInt(level)) + ' ' + text.trim() + '\n\n')
      // 段落转换
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      // 粗体转换
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      // 斜体转换
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      // 代码转换
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      // 链接转换
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
      // 列表转换
      .replace(/<ul>(.*?)<\/ul>/gis, (_, content) => {
        return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol>(.*?)<\/ol>/gis, (_, content) => {
        let counter = 1;
        return content.replace(/<li>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      // 引用转换
      .replace(/<blockquote>(.*?)<\/blockquote>/gis, (_, content) => {
        return content.split('\n').map(line => '> ' + line.trim()).join('\n') + '\n\n';
      })
      // 分割线转换
      .replace(/<hr\s*\/?>/gi, '---\n\n')
      // 图片转换
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
      // 换行转换
      .replace(/<br\s*\/?>/gi, '\n')
      // 清理HTML标签
      .replace(/<[^>]*>/g, '')
      // 清理多余的空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 模拟用户输入
   */
  simulateInput(element, value) {
    if (!element) return false;
    
    try {
      // 聚焦元素
      element.focus();
      
      // 清空现有内容
      element.value = '';
      
      // 设置新值
      element.value = value;
      
      // 触发输入事件
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
      
      return true;
    } catch (error) {
      console.error('模拟输入失败:', error);
      return false;
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 应用掘金发布设置
   */
  async applySettings(settings) {
    console.log('🔍 掘金平台：掘金平台不支持自动设置');
    return {
      success: false,
      error: '掘金平台不支持自动应用发布设置'
    };
  }
}

// 导出平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = JuejinPlatform;
} else if (typeof window !== 'undefined') {
  window.JuejinPlatform = JuejinPlatform;
}
