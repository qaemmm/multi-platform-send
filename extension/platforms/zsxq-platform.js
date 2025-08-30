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
      supportsFill: false, // 不支持自动填充
      supportsPublish: true, // 支持自动发布
      supportsSchedule: false,
      supportsCopy: false, // 不支持复制功能
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
   * 填充内容到知识星球编辑器 - 已禁用
   */
  async fillContent(data) {
    return {
      success: false,
      error: '知识星球平台已禁用填充功能，请使用发布功能'
    };
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
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成纯文本摘要（用于topic）
   */
  generateTextSummary(title, content) {
    // 清理HTML标签，但保留基本换行结构
    let cleanContent = content
      .replace(/<br\s*\/?>/gi, '\n')  // 将<br>转换为换行
      .replace(/<\/p>/gi, '\n\n')     // 段落结束添加两个换行
      .replace(/<[^>]+>/g, '')        // 移除其他HTML标签
      .replace(/\n{3,}/g, '\n\n')     // 合并多余换行，最多保留两个
      .replace(/[ \t]+/g, ' ')        // 合并空格和制表符
      .trim();

    // 只返回内容，不包含标题
    if (cleanContent.length > 150) {
      return cleanContent.substring(0, 150) + '...';
    } else {
      return cleanContent;
    }
  }




  /**
   * 转换列表标签为知识星球支持的格式
   */
  convertListsForZsxq(html) {
    if (!html) return '';

    let content = html;

    // 处理有序列表 - 将ol转换为div，li转换为带数字的div
    content = content.replace(/<ol([^>]*)>([\s\S]*?)<\/ol>/gi, (_, attrs, listContent) => {
      let counter = 1;
      const processedContent = listContent.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (__, liAttrs, liContent) => {
        return `<div${liAttrs}><p style="margin: 16px 0;">${counter++}. ${liContent.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '')}</p></div>`;
      });
      return `<div${attrs}>${processedContent}</div>`;
    });

    // 处理无序列表 - 将ul转换为div，li转换为带圆点的div
    content = content.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, (_, attrs, listContent) => {
      const processedContent = listContent.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (__, liAttrs, liContent) => {
        return `<div${liAttrs}><p style="margin: 16px 0;">• ${liContent.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '')}</p></div>`;
      });
      return `<div${attrs}>${processedContent}</div>`;
    });

    return content;
  }

  /**
   * 合并HTML属性中的style样式
   */
  mergeStyleAttrs(existingAttrs, newStyle) {
    if (!existingAttrs) {
      return ` style="${newStyle}"`;
    }

    // 检查是否已有style属性
    const styleMatch = existingAttrs.match(/style\s*=\s*["']([^"']*)["']/i);
    if (styleMatch) {
      // 合并现有样式和新样式
      const existingStyle = styleMatch[1];
      const mergedStyle = existingStyle.endsWith(';') ? `${existingStyle} ${newStyle}` : `${existingStyle}; ${newStyle}`;
      return existingAttrs.replace(/style\s*=\s*["'][^"']*["']/i, `style="${mergedStyle}"`);
    } else {
      // 添加新的style属性
      return `${existingAttrs} style="${newStyle}"`;
    }
  }

  /**
   * 复制内容到剪贴板 - 已禁用
   */
  async copyContent(_data) {
    return {
      success: false,
      error: '知识星球平台已禁用复制功能，请使用发布功能'
    };
  }

  /**
   * 应用知识星球发布设置
   */
  async applySettings(_settings) {
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
  validateSettings(_settings) {
    // 知识星球现在自动获取星球列表，不需要手动配置
    return {
      valid: true,
      errors: []
    };
  }

  /**
   * 存储上次选择的星球
   */
  saveLastSelectedGroups(groupIds) {
    try {
      localStorage.setItem('zsxq_last_selected_groups', JSON.stringify(groupIds));
      console.log('✅ 保存上次选择的星球:', groupIds);
    } catch (error) {
      console.warn('⚠️ 保存星球选择失败:', error);
    }
  }

  /**
   * 清除上次选择的星球记录
   */
  clearLastSelectedGroups() {
    try {
      localStorage.removeItem('zsxq_last_selected_groups');
      console.log('🗑️ 已清除上次选择的星球记录');
      return true;
    } catch (error) {
      console.warn('⚠️ 清除星球选择记录失败:', error);
      return false;
    }
  }

  /**
   * 获取上次选择的星球
   */
  getLastSelectedGroups() {
    try {
      const stored = localStorage.getItem('zsxq_last_selected_groups');
      if (stored) {
        const groupIds = JSON.parse(stored);
        console.log('📖 读取上次选择的星球:', groupIds);
        return groupIds;
      }
    } catch (error) {
      console.warn('⚠️ 读取星球选择失败:', error);
    }
    return null;
  }

  /**
   * 获取用户的所有知识星球（优先显示上次选择的）
   */
  async fetchUserGroups(prioritizeLastSelected = true) {
    try {
      console.log('🔍 知识星球平台：开始获取用户星球列表');
      
      const response = await this.apiRequestWithRetry('https://api.zsxq.com/v2/groups', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      }, 2, 1500); // 降低重试次数，减少获取列表的延迟

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.resp_data && data.resp_data.groups) {
        const groups = data.resp_data.groups.map(group => ({
          groupId: group.group_id,
          name: group.name || group.group_name || `星球-${group.group_id}`,
          description: group.description || '',
          avatar: group.avatar_url || '',
          memberCount: group.members_count || 0
        }));
        
        console.log('✅ 知识星球平台：成功获取星球列表', groups.length, '个星球');
        
        // 如果需要优先显示上次选择的星球，则重新排序
        console.log('🔍 排序参数:', { prioritizeLastSelected, groupsLength: groups.length });
        if (prioritizeLastSelected) {
          const lastSelected = this.getLastSelectedGroups();
          console.log('🔍 获取到的上次选择:', lastSelected);
          if (lastSelected && lastSelected.length > 0) {
            const sortedGroups = [];
            const remainingGroups = [...groups];
            
            console.log('🔍 开始排序，原始groups长度:', remainingGroups.length);
            
            // 先添加上次选择的星球（按选择顺序）
            lastSelected.forEach(selectedId => {
              // 确保ID类型匹配（尝试字符串和数字两种类型）
              const index = remainingGroups.findIndex(g => 
                g.groupId === selectedId || 
                g.groupId === String(selectedId) || 
                String(g.groupId) === selectedId
              );
              console.log(`🔍 查找星球 ${selectedId} (类型: ${typeof selectedId})，找到索引:`, index);
              if (index >= 0) {
                const group = remainingGroups.splice(index, 1)[0];
                group.lastSelected = true; // 标记为上次选择的
                sortedGroups.push(group);
                console.log(`✅ 添加上次选择的星球: ${group.name} (groupId: ${group.groupId}, 类型: ${typeof group.groupId})`);
              }
            });
            
            // 再添加其他星球
            remainingGroups.forEach(group => {
              group.lastSelected = false;
              sortedGroups.push(group);
            });
            
            console.log(`📌 排序完成，sortedGroups长度: ${sortedGroups.length}，前3个星球:`, sortedGroups.slice(0, 3).map(g => ({ name: g.name, lastSelected: g.lastSelected })));
            return sortedGroups;
          }
        }
        
        return groups;
      } else {
        throw new Error('API响应格式不正确');
      }
    } catch (error) {
      console.error('❌ 知识星球平台：获取星球列表失败:', error);
      return [];
    }
  }

  /**
   * 获取多个知识星球的编辑器URL
   */
  async getEditorUrls(groupIds = null) {
    // 如果没有提供groupIds，自动获取所有星球
    if (!groupIds) {
      const groups = await this.fetchUserGroups();
      return groups.map(group => ({
        groupId: group.groupId,
        url: `https://wx.zsxq.com/article?groupId=${group.groupId}`,
        name: group.name
      }));
    }

    if (!Array.isArray(groupIds)) {
      return [];
    }

    return groupIds.map(groupId => ({
      groupId,
      url: `https://wx.zsxq.com/article?groupId=${groupId}`,
      name: `知识星球-${groupId}`
    }));
  }

  /**
   * 一键发布到所有知识星球（测试模式）
   */
  async oneClickPublish(data, testMode = true) {
    try {
      console.log('🔍 知识星球平台：开始一键发布到所有星球');
      
      // 获取用户的所有星球
      const groups = await this.fetchUserGroups();
      
      if (groups.length === 0) {
        return {
          success: false,
          error: '未找到任何知识星球，请确保已登录知识星球账户'
        };
      }

      console.log(`🔍 知识星球平台：发现 ${groups.length} 个星球`);
      
      if (testMode) {
        console.log('⚠️ 测试模式：只返回星球列表，不进行真实发布');
        return {
          success: true,
          message: `测试模式：发现 ${groups.length} 个星球，准备就绪`,
          groups: groups.map(g => ({
            groupId: g.groupId,
            name: g.name,
            memberCount: g.memberCount
          })),
          totalGroups: groups.length,
          testMode: true
        };
      }
      
      // 非测试模式：只发布到第一个星球进行测试
      const testGroups = groups.slice(0, 1);
      console.log(`🔍 知识星球平台：测试发布到 1 个星球: ${testGroups[0].name}`);
      
      // 批量发布到测试星球
      const results = await this.publishToMultipleGroups(data, testGroups);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      console.log(`✅ 知识星球平台：测试发布完成，成功 ${successCount} 个，失败 ${failCount} 个`);

      return {
        success: true,
        message: `测试发布完成！${successCount > 0 ? `成功发布到 ${results[0].groupName}` : '发布失败'}`,
        results,
        totalGroups: groups.length,
        testedGroups: 1,
        successCount,
        failCount
      };

    } catch (error) {
      console.error('❌ 知识星球平台：一键发布失败:', error);
      return {
        success: false,
        error: '一键发布失败: ' + error.message
      };
    }
  }

  /**
   * 支持多星球发布
   */
  async publishToMultipleGroups(data, groups) {
    const results = [];
    let successCount = 0;
    let totalAttempts = 0;
    const baseDelay = 5000; // 基础延迟5秒，避免触发风控

    console.log(`🚀 开始批量发布到 ${groups.length} 个星球，使用智能间隔控制`);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      totalAttempts++;
      
      try {
        console.log(`🔍 知识星球平台：发布到星球 ${group.name} (${group.groupId}) [${i + 1}/${groups.length}]`);
        
        // 为每个星球创建单独的发布任务
        const result = await this.publishToGroup(data, group);
        
        const resultData = {
          groupId: group.groupId,
          groupName: group.name,
          success: result.success,
          message: result.message || result.error,
          url: result.url,
          attempt: totalAttempts
        };
        
        results.push(resultData);
        
        if (result.success) {
          successCount++;
          console.log(`✅ 发布成功 (${successCount}/${totalAttempts}): ${group.name}`);
        } else {
          console.log(`❌ 发布失败 (${successCount}/${totalAttempts}): ${group.name} - ${result.error}`);
        }

        // 如果不是最后一个星球，添加智能延迟
        if (i < groups.length - 1) {
          const dynamicDelay = this.calculateDelay(successCount, totalAttempts, baseDelay);
          console.log(`⏱️ 智能延迟 ${dynamicDelay}ms（成功率: ${((successCount/totalAttempts) * 100).toFixed(1)}%）`);
          await this.delay(dynamicDelay);
        }
        
      } catch (error) {
        console.error(`❌ 发布到 ${group.name} 时发生异常:`, error);
        
        results.push({
          groupId: group.groupId,
          groupName: group.name,
          success: false,
          message: error.message,
          attempt: totalAttempts,
          error: true
        });
        
        // 发生异常时增加额外延迟
        if (i < groups.length - 1) {
          const errorDelay = baseDelay * 2;
          console.log(`⚠️ 异常后延迟 ${errorDelay}ms`);
          await this.delay(errorDelay);
        }
      }
    }

    // 输出批量发布统计
    const failCount = totalAttempts - successCount;
    const successRate = (successCount / totalAttempts * 100).toFixed(1);
    console.log(`📊 批量发布完成: 成功 ${successCount}/${totalAttempts} (${successRate}%), 失败 ${failCount}`);

    // 注：用户选择已在确认发布时保存，这里不再重复保存

    return results;
  }

  /**
   * 发布到单个知识星球
   */
  async publishToGroup(data, group) {
    try {
      console.log(`🔍 知识星球平台：开始发布到星球 ${group.name}`);
      
      const groupId = group.groupId || group;
      
      // 简化：直接使用原始HTML内容
      let contentToPublish = '';

      // 添加发布预设的开头内容
      if (data.preset && data.preset.headerContent) {
        contentToPublish += data.preset.headerContent + '\n\n';
      }

      // 处理HTML内容，转换ol/ul标签
      if (data.content) {
        console.log('🔍 处理HTML内容，转换列表标签');
        contentToPublish += this.convertListsForZsxq(data.content);
      }

      // 添加发布预设的结尾内容
      if (data.preset && data.preset.footerContent) {
        contentToPublish += '\n\n' + data.preset.footerContent;
      }

      // 暂时不处理图片上传，直接传原始内容
      const imageIds = [];


      // 直接调用API发布
      try {
        const publishResult = await this.directPublishToGroup(groupId, data.title, contentToPublish, imageIds);
        
        if (publishResult.success) {
          return {
            success: true,
            message: `已成功发布到 ${group.name || groupId}`,
            url: publishResult.url
          };
        } else {
          return {
            success: false,
            error: publishResult.error || 'API发布失败'
          };
        }
      } catch (apiError) {
        console.error(`❌ API发布失败:`, apiError.message);
        
        // API发布失败，返回错误信息
        return {
          success: false,
          error: `API发布失败: ${apiError.message}`
        };
      }

    } catch (error) {
      console.error(`❌ 发布到星球失败:`, error);
      return {
        success: false,
        error: '发布失败: ' + error.message,
        url: `https://wx.zsxq.com/article?groupId=${group.groupId || group}`
      };
    }
  }

  /**
   * 带重试机制的API请求
   */
  async apiRequestWithRetry(url, options, maxRetries = 3, baseDelay = 3000) {
    let lastError;
    let lastResponse;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 API请求尝试 ${attempt}/${maxRetries}: ${url}`);
        
        const response = await fetch(url, options);
        lastResponse = response;
        
        // 检查是否为风控或服务器错误
        if (response.status === 429) {
          console.warn('⚠️ 触发限流，等待更长时间重试...');
          await this.delay(baseDelay * 4 * attempt); // 限流时等待更久
          continue;
        }
        
        if (response.status >= 500) {
          console.warn(`⚠️ 服务器错误 ${response.status}，准备重试...`);
          throw new Error(`服务器内部错误: ${response.status}`);
        }
        
        // 对于知识星球API，还需要检查响应体中的错误
        if (response.ok) {
          const responseClone = response.clone();
          try {
            const result = await responseClone.json();
            if (result && !result.succeeded && result.error === "内部错误") {
              console.warn(`⚠️ 知识星球内部错误，准备重试... (code: ${result.code})`);
              throw new Error(`知识星球内部错误: ${result.code}`);
            }
          } catch (jsonError) {
            // 如果不是JSON响应，忽略检查
          }
        }
        
        // 其他错误直接返回，不重试
        if (!response.ok && response.status < 500) {
          return response;
        }
        
        console.log(`✅ API请求成功 (尝试 ${attempt}/${maxRetries})`);
        return response;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ API请求失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          console.error('❌ 所有重试都已失败');
          break;
        }
        
        // 对于知识星球的"内部错误"，使用更长的延迟
        const isInternalError = error.message.includes('内部错误') || error.message.includes('内部错误');
        const multiplier = isInternalError ? 3 : 2;
        const randomDelay = Math.random() * 2000; // 增加随机性避免同时重试
        const delay = baseDelay * Math.pow(multiplier, attempt - 1) + randomDelay;
        
        console.log(`⏱️ 等待 ${Math.round(delay)}ms 后重试... (${isInternalError ? '内部错误' : '一般错误'})`);
        await this.delay(delay);
      }
    }
    
    throw lastError || new Error('API请求重试失败');
  }

  /**
   * 检测错误类型并决定是否需要重试
   */
  isRetryableError(error, response) {
    // 网络错误，需要重试
    if (!response) return true;
    
    // 服务器内部错误，需要重试
    if (response.status >= 500) return true;
    
    // 限流错误，需要重试
    if (response.status === 429) return true;
    
    // 检查响应内容中的风控信息
    try {
      if (error.message.includes('内部错误') || 
          error.message.includes('服务暂时不可用') ||
          error.message.includes('请稍后重试')) {
        return true;
      }
    } catch (e) {
      // ignore
    }
    
    return false;
  }

  /**
   * 动态调整发布间隔（根据成功率）
   */
  calculateDelay(successCount, totalCount, baseDelay = 5000) {
    const failureRate = totalCount > 0 ? (totalCount - successCount) / totalCount : 0;
    
    // 知识星球风控较严，使用更保守的延迟策略
    if (failureRate > 0.6) {
      return baseDelay * 4; // 失败率超过60%，延迟4倍
    } else if (failureRate > 0.4) {
      return baseDelay * 3; // 失败率超过40%，延迟3倍  
    } else if (failureRate > 0.2) {
      return baseDelay * 2; // 失败率超过20%，延迟2倍
    } else if (failureRate > 0.1) {
      return baseDelay * 1.5; // 失败率超过10%，延迟1.5倍
    }
    
    // 即使成功率高，也保持基础延迟
    return baseDelay;
  }

  /**
   * 直接调用API发布到指定星球（带重试机制）
   */
  async directPublishToGroup(groupId, title, content, imageIds = []) {
    try {
      console.log(`🔍 知识星球平台：直接API发布到星球 ${groupId}`);
      
      // 第一步：创建文章（使用重试机制）
      const articlePayload = {
        req_data: {
          group_id: groupId,
          article_id: "",
          title: title,
          content: content,
          image_ids: imageIds,
          scheduled_article: false
        }
      };

      console.log('📤 创建文章请求参数:', JSON.stringify(articlePayload, null, 2));

      const articleResponse = await this.apiRequestWithRetry('https://api.zsxq.com/v2/articles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(articlePayload)
      });

      console.log('📥 创建文章响应状态:', articleResponse.status, articleResponse.statusText);

      if (!articleResponse.ok) {
        const errorText = await articleResponse.text();
        console.error('📥 创建文章错误响应:', errorText);
        throw new Error(`创建文章失败: ${articleResponse.status} ${articleResponse.statusText} - ${errorText}`);
      }

      const articleResult = await articleResponse.json();
      console.log('📥 创建文章响应结果:', JSON.stringify(articleResult, null, 2));

      if (!articleResult.succeeded) {
        throw new Error(`创建文章失败: ${articleResult.error_message || articleResult.error_code || '未知错误'}`);
      }

      const articleId = articleResult.resp_data.article_id;
      const articleUrl = `https://articles.zsxq.com/id_${articleId}.html`;
      console.log(`✅ 文章创建成功，ID: ${articleId}`);

      // 第二步：发布主题到星球（使用重试机制）
      const summary = this.generateTextSummary(title, content);
      
      const topicPayload = {
        req_data: {
          type: "talk",
          text: summary,
          article_id: articleId
        }
      };

      console.log('📤 发布主题请求参数:', JSON.stringify(topicPayload, null, 2));

      const topicResponse = await this.apiRequestWithRetry(`https://api.zsxq.com/v2/groups/${groupId}/topics`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(topicPayload)
      });

      console.log('📥 发布主题响应状态:', topicResponse.status, topicResponse.statusText);

      if (!topicResponse.ok) {
        const errorText = await topicResponse.text();
        console.error('📥 发布主题错误响应:', errorText);
        throw new Error(`发布主题失败: ${topicResponse.status} ${topicResponse.statusText} - ${errorText}`);
      }

      const topicResult = await topicResponse.json();
      console.log('📥 发布主题响应结果:', JSON.stringify(topicResult, null, 2));

      if (!topicResult.succeeded) {
        throw new Error(`发布主题失败: ${topicResult.error_message || topicResult.error_code || '未知错误'}`);
      }

      console.log(`✅ 主题发布成功到星球 ${groupId}`);

      return {
        success: true,
        message: '发布成功',
        url: articleUrl,
        articleId: articleId,
        topicId: topicResult.resp_data.topic_id
      };

    } catch (error) {
      console.error(`❌ 直接API发布失败:`, error);
      throw error;
    }
  }


  /**
   * 自动发布到指定星球
   */
  async autoPublishToGroup(groupId, content) {
    try {
      console.log(`🔍 知识星球平台：尝试自动发布到星球 ${groupId}`);
      
      // 在新标签页中打开编辑器
      const editorUrl = `https://wx.zsxq.com/article?groupId=${groupId}`;
      const newWindow = window.open(editorUrl, '_blank');
      
      if (!newWindow) {
        throw new Error('无法打开新窗口，可能被浏览器拦截');
      }

      // 等待页面加载
      await this.delay(3000);

      // 尝试向新窗口注入内容
      try {
        // 由于跨域限制，我们无法直接操作新窗口的内容
        // 这里我们提供一个备选方案：复制内容到剪贴板
        
        // 确保当前窗口获得焦点，以便剪贴板API正常工作
        window.focus();
        
        await navigator.clipboard.writeText(content);
        
        console.log('✅ 知识星球平台：内容已复制到剪贴板，请在新打开的编辑器中粘贴');
        
        return {
          success: true,
          message: '已打开编辑器并复制内容到剪贴板，请手动粘贴并发布'
        };
        
      } catch (clipboardError) {
        console.warn('⚠️ 复制到剪贴板失败:', clipboardError);
        throw new Error('无法自动填充内容，请手动复制粘贴');
      }

    } catch (error) {
      console.error('❌ 自动发布失败:', error);
      throw error;
    }
  }
}

// 导出平台类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZsxqPlatform;
} else if (typeof window !== 'undefined') {
  window.ZsxqPlatform = ZsxqPlatform;
}
