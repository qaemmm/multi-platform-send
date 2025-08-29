/**
 * 知识星球平台处理器
 */
class ZsxqPlatform extends BasePlatform {
  constructor() {
    super({
      name: 'zsxq',
      displayName: '知识星球',
      urlPatterns: [
        '*://wx.zsxq.com/group/*',
        '*://wx.zsxq.com/article?groupId=*'
      ],
      editorUrl: 'https://wx.zsxq.com/article?groupId='
    });
    
    // 知识星球平台配置
    this.config = {
      supportsFill: true, // 支持自动填充
      supportsPublish: true, // 支持自动发布
      supportsSchedule: false,
      supportsCopy: true, // 支持复制功能
      supportsMarkdown: true, // 支持Markdown格式
      supportsMultipleTargets: true, // 支持多星球发布
      maxContentLength: 10000 // 知识星球限制10000字
    };
  }

  /**
   * 查找知识星球编辑器元素
   */
  findEditorElements() {
    console.log('🔍 知识星球平台：查找编辑器元素');

    // 检查是否是知识星球编辑器页面
    const isZsxqEditor = this.isEditorPage(window.location.href);

    let titleInput = null;
    let contentEditor = null;
    let publishButton = null;
    let quillEditor = null;

    if (isZsxqEditor) {
      // 查找Quill编辑器
      quillEditor = document.querySelector('quill-editor');
      
      // 查找内容编辑器（Quill编辑器内的可编辑区域）
      contentEditor = document.querySelector('quill-editor div[contenteditable="true"]') ||
                     document.querySelector('.ql-editor') ||
                     document.querySelector('[contenteditable="true"]');

      // 查找发布按钮
      publishButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && btn.textContent.includes('发布')
      );

      // 知识星球通常没有单独的标题输入框，标题包含在内容中
      titleInput = null;
    }

    console.log('🔍 知识星球编辑器检测结果:', {
      url: window.location.href,
      isEditor: isZsxqEditor,
      quillEditor: !!quillEditor,
      contentEditor: !!contentEditor,
      publishButton: !!publishButton
    });

    return {
      isZsxqEditor,
      isEditor: isZsxqEditor,
      titleInput,
      contentEditor,
      publishButton,
      quillEditor,
      platform: 'zsxq'
    };
  }

  /**
   * 等待编辑器加载
   */
  async waitForEditor(maxWait = 10000) {
    console.log('🔍 知识星球平台：等待编辑器加载');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const elements = this.findEditorElements();
      
      if (elements.isEditor && elements.contentEditor) {
        console.log('✅ 知识星球编辑器已就绪');
        return elements;
      }
      
      await this.delay(500);
    }
    
    console.warn('⚠️ 知识星球编辑器加载超时');
    return this.findEditorElements();
  }

  /**
   * 填充内容到知识星球编辑器
   */
  async fillContent(data) {
    try {
      console.log('🔍 知识星球平台：开始填充内容', data);

      // 等待编辑器加载
      const elements = await this.waitForEditor();
      
      if (!elements.isEditor) {
        return {
          success: false,
          error: '当前页面不是知识星球编辑器',
          showCopyOption: true
        };
      }

      if (!elements.contentEditor) {
        return {
          success: false,
          error: '未找到知识星球编辑器，请刷新页面重试',
          showCopyOption: true
        };
      }

      // 准备要填充的内容
      let contentToFill = '';

      // 添加发布预设的开头内容
      if (data.preset && data.preset.headerContent) {
        console.log('🔍 知识星球平台：添加发布预设的开头内容');
        contentToFill += data.preset.headerContent + '\n\n';
      }

      // 添加标题（如果有）
      if (data.title) {
        contentToFill += `# ${data.title}\n\n`;
      }

      // 添加主要内容
      if (data.originalMarkdown) {
        // 将Markdown转换为适合知识星球的格式
        contentToFill += this.markdownToZsxqFormat(data.originalMarkdown);
      } else if (data.content) {
        // 如果没有原始Markdown，使用HTML内容并转换
        contentToFill += this.htmlToZsxqFormat(data.content);
      }

      // 添加发布预设的结尾内容
      if (data.preset && data.preset.footerContent) {
        console.log('🔍 知识星球平台：添加发布预设的结尾内容');
        contentToFill += '\n\n' + data.preset.footerContent;
      }

      // 检查内容长度
      if (contentToFill.length > this.config.maxContentLength) {
        console.warn('⚠️ 内容长度超过知识星球限制');
        return {
          success: false,
          error: `内容长度(${contentToFill.length})超过知识星球限制(${this.config.maxContentLength}字)`,
          showCopyOption: true
        };
      }

      // 填充内容到编辑器
      const fillResult = await this.fillQuillEditor(elements.contentEditor, contentToFill);
      
      if (fillResult) {
        console.log('✅ 知识星球平台：内容填充成功');
        return {
          success: true,
          message: '内容已成功填充到知识星球编辑器'
        };
      } else {
        return {
          success: false,
          error: '填充内容到编辑器失败，请使用复制功能',
          showCopyOption: true
        };
      }

    } catch (error) {
      console.error('❌ 知识星球平台：填充失败:', error);
      return {
        success: false,
        error: '填充失败: ' + error.message,
        showCopyOption: true
      };
    }
  }

  /**
   * 填充内容到Quill编辑器
   */
  async fillQuillEditor(editor, content) {
    try {
      // 聚焦编辑器
      editor.focus();
      
      // 清空现有内容
      editor.innerHTML = '';
      
      // 设置新内容
      editor.innerHTML = this.textToHtml(content);
      
      // 触发输入事件
      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true });
      editor.dispatchEvent(changeEvent);
      
      return true;
    } catch (error) {
      console.error('填充Quill编辑器失败:', error);
      return false;
    }
  }

  /**
   * 将文本转换为HTML格式
   */
  textToHtml(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  /**
   * Markdown转知识星球格式
   */
  markdownToZsxqFormat(markdown) {
    // 知识星球支持基本的文本格式，但不是完整的Markdown
    return markdown
      // 保留标题但简化格式
      .replace(/^#{1,6}\s+(.+)$/gm, '$1\n')
      // 保留粗体
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // 保留斜体
      .replace(/\*(.*?)\*/g, '$1')
      // 简化代码块
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim();
      })
      // 简化行内代码
      .replace(/`(.*?)`/g, '$1')
      // 简化链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      // 保留列表但简化
      .replace(/^[-*+]\s+(.+)$/gm, '• $1')
      .replace(/^\d+\.\s+(.+)$/gm, '$1')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * HTML转知识星球格式
   */
  htmlToZsxqFormat(html) {
    if (!html) return '';
    
    return html
      // 标题转换
      .replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '$1\n\n')
      // 段落转换
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      // 粗体转换
      .replace(/<strong>(.*?)<\/strong>/gi, '$1')
      .replace(/<b>(.*?)<\/b>/gi, '$1')
      // 斜体转换
      .replace(/<em>(.*?)<\/em>/gi, '$1')
      .replace(/<i>(.*?)<\/i>/gi, '$1')
      // 代码转换
      .replace(/<code>(.*?)<\/code>/gi, '$1')
      .replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '$1\n\n')
      // 链接转换
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '$2 ($1)')
      // 列表转换
      .replace(/<ul>(.*?)<\/ul>/gis, (_, content) => {
        return content.replace(/<li>(.*?)<\/li>/gi, '• $1\n') + '\n';
      })
      .replace(/<ol>(.*?)<\/ol>/gis, (_, content) => {
        let counter = 1;
        return content.replace(/<li>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      // 换行转换
      .replace(/<br\s*\/?>/gi, '\n')
      // 清理HTML标签
      .replace(/<[^>]+>/g, '')
      // 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 将Markdown转换为知识星球格式
   */
  markdownToZsxqFormat(markdown) {
    if (!markdown) return '';

    let content = markdown;

    // 处理标题 - 知识星球支持标题格式
    content = content.replace(/^### (.*$)/gim, '### $1');
    content = content.replace(/^## (.*$)/gim, '## $1');
    content = content.replace(/^# (.*$)/gim, '# $1');

    // 处理粗体 - 知识星球支持**粗体**
    content = content.replace(/\*\*(.*?)\*\*/g, '**$1**');

    // 处理斜体 - 知识星球支持*斜体*
    content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '*$1*');

    // 处理删除线 - 知识星球支持~~删除线~~
    content = content.replace(/~~(.*?)~~/g, '~~$1~~');

    // 处理引用 - 转换为简单的引用格式
    content = content.replace(/^> (.*$)/gim, '> $1');

    // 处理代码块 - 知识星球支持```代码块```
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '```\n$2```');

    // 处理行内代码 - 知识星球支持`代码`
    content = content.replace(/`([^`]+)`/g, '`$1`');

    // 处理链接 - 知识星球支持[文字](链接)格式
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)');

    // 处理图片 - 知识星球支持图片，但需要上传
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[图片: $1]');

    // 处理无序列表 - 知识星球支持- 列表
    content = content.replace(/^[\s]*[-*+] (.*$)/gim, '• $1');

    // 处理有序列表 - 知识星球支持数字列表
    content = content.replace(/^[\s]*\d+\. (.*$)/gim, (match, p1, offset, string) => {
      const lines = string.substring(0, offset).split('\n');
      const currentLineIndex = lines.length - 1;
      let listNumber = 1;

      // 计算当前列表项的序号
      for (let i = currentLineIndex - 1; i >= 0; i--) {
        if (/^[\s]*\d+\. /.test(lines[i])) {
          listNumber++;
        } else {
          break;
        }
      }

      return `${listNumber}. ${p1}`;
    });

    // 处理分割线
    content = content.replace(/^---+$/gm, '---');

    // 处理表格 - 知识星球不直接支持表格，转换为文本格式
    content = content.replace(/\|(.+)\|/g, (match, p1) => {
      return p1.split('|').map(cell => cell.trim()).join(' | ');
    });

    return content;
  }

  /**
   * 将HTML转换为知识星球格式
   */
  htmlToZsxqFormat(html) {
    if (!html) return '';

    let content = html;

    // 移除HTML标签，保留文本内容
    content = content.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n# $1\n');
    content = content.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    content = content.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    content = content.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    content = content.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    content = content.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    content = content.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    content = content.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    content = content.replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```');
    content = content.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1');
    content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    content = content.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '[图片: $1]');
    content = content.replace(/<br\s*\/?>/gi, '\n');
    content = content.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    content = content.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
    content = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
    content = content.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1');
    content = content.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1');

    // 清理多余的换行
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();

    return content;
  }

  /**
   * 复制内容到剪贴板
   */
  async copyContent(data) {
    try {
      console.log('🔍 知识星球平台：开始复制内容', data);

      let contentToCopy = '';

      // 添加发布预设的开头内容
      if (data.preset && data.preset.headerContent) {
        console.log('🔍 知识星球平台：添加发布预设的开头内容');
        contentToCopy += data.preset.headerContent + '\n\n';
      }

      // 添加标题（如果有）
      if (data.title) {
        contentToCopy += `${data.title}\n\n`;
      }

      // 优先使用原始Markdown内容并转换为知识星球格式
      if (data.originalMarkdown) {
        contentToCopy += this.markdownToZsxqFormat(data.originalMarkdown);
      } else if (data.content) {
        // 如果没有原始Markdown，使用HTML内容并转换
        contentToCopy += this.htmlToZsxqFormat(data.content);
      }

      // 添加发布预设的结尾内容
      if (data.preset && data.preset.footerContent) {
        console.log('🔍 知识星球平台：添加发布预设的结尾内容');
        contentToCopy += '\n\n' + data.preset.footerContent;
      }

      // 检查内容长度
      if (contentToCopy.length > this.config.maxContentLength) {
        console.warn('⚠️ 内容长度超过知识星球限制');
        contentToCopy = contentToCopy.substring(0, this.config.maxContentLength - 100) + '\n\n[内容已截断，请手动调整]';
      }

      console.log('🔍 知识星球平台：最终复制内容长度:', contentToCopy.length);

      // 复制到剪贴板
      await navigator.clipboard.writeText(contentToCopy);

      console.log('✅ 知识星球平台：内容已复制到剪贴板');
      return {
        success: true,
        message: '内容已复制到剪贴板，请手动粘贴到知识星球编辑器中'
      };

    } catch (error) {
      console.error('❌ 知识星球平台：复制失败:', error);
      return {
        success: false,
        error: '复制失败: ' + error.message
      };
    }
  }

  /**
   * 应用知识星球发布设置
   */
  async applySettings(settings) {
    console.log('🔍 知识星球平台：知识星球平台暂不支持自动设置');
    return {
      success: false,
      error: '知识星球平台暂不支持自动应用发布设置'
    };
  }

  /**
   * 获取平台特定的发布设置
   */
  getPublishSettings() {
    return {
      supportedFormats: ['text', 'html'],
      maxTitleLength: 100,
      maxContentLength: this.config.maxContentLength,
      supportsTags: false,
      supportsScheduling: false,
      supportsVisibility: false,
      supportsImages: true,
      supportsLinks: true
    };
  }

  /**
   * 获取知识星球配置选项
   */
  getConfigOptions() {
    return {
      groupIds: {
        type: 'array',
        label: '知识星球ID列表',
        description: '支持发布到多个知识星球，请输入星球ID',
        placeholder: '例如: 28882842528281',
        required: true
      },
      autoFill: {
        type: 'boolean',
        label: '自动填充',
        description: '是否自动填充内容到编辑器',
        default: true
      }
    };
  }

  /**
   * 验证发布设置
   */
  validateSettings(settings) {
    const errors = [];

    if (!settings.groupIds || !Array.isArray(settings.groupIds) || settings.groupIds.length === 0) {
      errors.push('请至少配置一个知识星球ID');
    }

    // 验证groupId格式（应该是数字字符串）
    if (settings.groupIds) {
      settings.groupIds.forEach((groupId, index) => {
        if (!groupId || !/^\d+$/.test(groupId.toString())) {
          errors.push(`第${index + 1}个知识星球ID格式不正确，应该是纯数字`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取多个知识星球的编辑器URL
   */
  getEditorUrls(groupIds) {
    if (!groupIds || !Array.isArray(groupIds)) {
      return [];
    }

    return groupIds.map(groupId => ({
      groupId,
      url: `https://wx.zsxq.com/article?groupId=${groupId}`,
      name: `知识星球-${groupId}`
    }));
  }

  /**
   * 支持多星球发布
   */
  async publishToMultipleGroups(data, groupIds) {
    const results = [];

    for (const groupId of groupIds) {
      try {
        // 为每个星球创建单独的发布任务
        const result = await this.publishToGroup(data, groupId);
        results.push({
          groupId,
          success: result.success,
          message: result.message || result.error
        });
      } catch (error) {
        results.push({
          groupId,
          success: false,
          message: error.message
        });
      }
    }

    return results;
  }

  /**
   * 发布到单个知识星球
   */
  async publishToGroup(data, groupId) {
    // 这里可以实现具体的发布逻辑
    // 目前返回需要手动操作的提示
    return {
      success: false,
      error: `请手动打开知识星球 ${groupId} 进行发布`,
      url: `https://wx.zsxq.com/article?groupId=${groupId}`
    };
  }
}

// 导出平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZsxqPlatform;
} else if (typeof window !== 'undefined') {
  window.ZsxqPlatform = ZsxqPlatform;
}
