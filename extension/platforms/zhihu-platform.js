/**
 * 知乎平台处理器 - 简化版（仅支持复制功能）
 */
class ZhihuPlatform extends BasePlatform {
  constructor() {
    super({
      name: 'zhihu',
      displayName: '知乎',
      urlPatterns: [
        '*://zhuanlan.zhihu.com/write*',
        '*://zhuanlan.zhihu.com/p/*/edit*'
      ],
      editorUrl: 'https://zhuanlan.zhihu.com/write'
    });
    
    // 知乎平台配置
    this.config = {
      supportsFill: false, // 不支持自动填充
      supportsPublish: false,
      supportsSchedule: false,
      supportsCopy: true // 只支持复制功能
    };
  }

  /**
   * 知乎平台检测编辑器元素
   */
  findEditorElements() {
    console.log('🔍 知乎平台：查找编辑器元素');

    // 知乎编辑器是动态的，只要URL匹配就认为是编辑器页面
    const isZhihuEditor = this.urlPatterns.some(pattern =>
      new RegExp(pattern.replace(/\*/g, '.*')).test(window.location.href)
    );

    // 查找实际的编辑器元素
    let titleInput = null;
    let contentEditor = null;
    let publishButton = null;

    if (isZhihuEditor) {
      // 查找标题输入框（知乎的标题框在内容框上方）
      const allTextboxes = document.querySelectorAll('div[contenteditable="true"], input[type="text"], textarea');

      // 按照在页面中的位置排序，第一个通常是标题框
      const sortedTextboxes = Array.from(allTextboxes).sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectA.top - rectB.top; // 按垂直位置排序
      });

      // 排除插件自己的输入框，选择第一个（最上方的）
      titleInput = sortedTextboxes.find(element =>
        !element.id.includes('ziliu') &&
        !element.className.includes('ziliu') &&
        element.offsetParent !== null && // 确保可见
        element.getBoundingClientRect().height < 200 // 标题框高度通常较小
      );

      // 查找内容编辑器
      contentEditor = document.querySelector('.public-DraftEditor-content') ||
                     document.querySelector('[contenteditable="true"]') ||
                     document.querySelector('.DraftEditor-root .public-DraftEditor-content') ||
                     document.querySelector('div[role="textbox"]');

      // 查找发布按钮
      publishButton = document.querySelector('button[type="submit"]') ||
                     document.querySelector('.PublishPanel-stepTwoButton') ||
                     Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('发布'));
    }

    console.log('🔍 知乎编辑器检测结果:', {
      url: window.location.href,
      isEditor: isZhihuEditor,
      titleInput: !!titleInput,
      contentEditor: !!contentEditor,
      publishButton: !!publishButton
    });

    return {
      isZhihuEditor,
      isEditor: isZhihuEditor,
      titleInput,
      contentEditor,
      publishButton,
      titleInputElement: titleInput,
      contentEditorElement: contentEditor
    };
  }

  /**
   * 等待编辑器加载（知乎平台简化版）
   */
  async waitForEditor() {
    console.log('🔍 知乎平台：等待编辑器加载');
    // 知乎平台只要URL匹配就认为编辑器已就绪
    return this.findEditorElements();
  }

  /**
   * 知乎平台不支持自动填充，只提供复制功能
   */
  async fillContent() {
    console.log('🔍 知乎平台：知乎平台不支持自动填充');
    return { 
      success: false, 
      error: '知乎平台暂不支持自动填充，请使用复制功能手动粘贴内容',
      showCopyOption: true 
    };
  }

  /**
   * 复制内容到剪贴板
   */
  async copyContent(data) {
    try {
      console.log('🔍 知乎平台：开始复制内容', data);

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
          console.log('🔍 知乎平台：添加发布预设的开头内容');
          contentToCopy = data.preset.headerContent + '\n\n' + contentToCopy;
        }

        // 添加结尾内容
        if (data.preset.footerContent) {
          console.log('🔍 知乎平台：添加发布预设的结尾内容');
          contentToCopy += '\n\n' + data.preset.footerContent;
        }
      }

      console.log('🔍 知乎平台：最终复制内容长度:', contentToCopy.length);

      // 复制到剪贴板
      await navigator.clipboard.writeText(contentToCopy);

      console.log('✅ 知乎平台：内容已复制到剪贴板');
      return {
        success: true,
        message: '内容已复制到剪贴板，请手动粘贴到知乎编辑器中'
      };
      
    } catch (error) {
      console.error('❌ 知乎平台：复制失败:', error);
      return { 
        success: false, 
        error: '复制失败: ' + error.message 
      };
    }
  }

  /**
   * 简单的HTML转Markdown
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
      // 换行转换
      .replace(/<br\s*\/?>/gi, '\n')
      // 清理HTML标签
      .replace(/<[^>]+>/g, '')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 获取平台特定的发布设置
   */
  getPublishSettings() {
    return {
      supportedFormats: ['markdown', 'html'],
      maxTitleLength: 100,
      maxContentLength: 300000,
      supportsTags: true,
      supportsScheduling: false,
      supportsVisibility: true
    };
  }

  /**
   * 应用知乎发布设置
   */
  async applySettings(settings) {
    console.log('🔍 知乎平台：知乎平台不支持自动设置');
    return { 
      success: false, 
      error: '知乎平台不支持自动应用发布设置' 
    };
  }

  /**
   * 获取知乎历史文章
   */
  async fetchZhihuArticles(count = 3) {
    console.log('🔍 知乎平台：知乎平台不支持获取历史文章');
    return [];
  }
}

// 导出平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZhihuPlatform;
} else if (typeof window !== 'undefined') {
  window.ZhihuPlatform = ZhihuPlatform;
}
