/**
 * 插件配置文件 - 定义所有可用的插件和平台
 * 新增平台只需要在这里添加配置即可
 */
window.ZiliuPluginConfig = {
  // 平台插件配置
  platforms: [
    {
      id: 'wechat',
      name: '微信公众号平台插件',
      displayName: '微信公众号',
      enabled: true,
      urlPatterns: [
        'https://mp.weixin.qq.com/*',
        'http://mp.weixin.qq.com/*'
      ],
      editorUrl: 'https://mp.weixin.qq.com/',
      selectors: {
        title: '#title',
        author: '#author',
        content: '.ProseMirror, .rich_media_content .ProseMirror, [contenteditable="true"]:not(.editor_content_placeholder)',
        contentFallback: '#ueditor_0',
        digest: 'textarea[name="digest"], #js_description, textarea[placeholder*="选填"]'
      },
      features: ['title', 'author', 'content', 'digest', 'richText'],
      contentType: 'html',
      specialHandling: {
        initDelay: 500,
        noCopyButton: true  // 微信公众号禁用复制按钮
      },
      priority: 10
    },
    {
      id: 'zhihu',
      name: '知乎平台插件',
      displayName: '知乎',
      enabled: true,
      requiredPlan: 'pro', // 需要专业版
      featureId: 'zhihu-platform',
      urlPatterns: [
        'https://zhuanlan.zhihu.com/write*',
        'https://zhuanlan.zhihu.com/p/*/edit*'
      ],
      editorUrl: 'https://zhuanlan.zhihu.com/write',
      selectors: {
        title: '.WriteIndex-titleInput input, input[placeholder*="请输入标题"]',
        content: '.DraftEditor-editorContainer [contenteditable="true"]'
      },
      features: ['title', 'content', 'markdown'],
      contentType: 'markdown',
      specialHandling: {
        waitForEditor: true,
        maxWaitTime: 10000,
        initDelay: 1500,
        retryOnFail: true,
        retryDelay: 2000,
        // 知乎平台按钮定制
        buttonConfig: {
          fillButton: {
            text: '填充标题',
            tooltip: '知乎平台仅填充标题，正文请使用复制功能'
          },
          copyButton: {
            text: '复制正文',
            tooltip: '复制文章正文内容'
          }
        },
        fillMode: 'titleOnly'  // 知乎只填充标题
      },
      priority: 8
    },
    {
      id: 'juejin',
      name: '掘金平台插件',
      displayName: '掘金',
      enabled: true,
      requiredPlan: 'pro', // 需要专业版
      featureId: 'juejin-platform',
      urlPatterns: [
        'https://juejin.cn/editor/*',
        'https://juejin.cn/post/*'
      ],
      editorUrl: 'https://juejin.cn/editor/drafts/new',
      selectors: {
        title: 'input[placeholder*="请输入标题"]',
        content: '.bytemd-editor .CodeMirror, .bytemd .CodeMirror'
      },
      features: ['title', 'content', 'markdown'],
      contentType: 'markdown',
      specialHandling: {
        initDelay: 2000,
        retryOnFail: true,
        retryDelay: 3000,
        // 掘金平台按钮定制
        buttonConfig: {
          fillButton: {
            text: '填充标题',
            tooltip: '掘金平台仅填充标题，正文请使用复制功能'
          },
          copyButton: {
            text: '复制正文',
            tooltip: '复制文章正文内容'
          }
        },
        fillMode: 'titleOnly'  // 掘金只填充标题
      },
      priority: 6
    },
    {
      id: 'zsxq',
      name: '知识星球平台插件',
      displayName: '知识星球',
      enabled: true,
      requiredPlan: 'pro', // 需要专业版
      featureId: 'zsxq-platform',
      urlPatterns: [
        'https://wx.zsxq.com/group/*',
        'https://wx.zsxq.com/article?groupId=*'
      ],
      editorUrl: 'https://wx.zsxq.com/',
      selectors: {
        title: 'input[placeholder*="请输入主题"]',
        content: '[contenteditable="true"]:not(.ql-editor-placeholder)'
      },
      features: ['title', 'content', 'listProcessing'],
      contentType: 'html',
      specialHandling: {
        processLists: true, // 处理ol/ul标签显示问题
        initDelay: 1000,
        noCopyButton: true, // 禁用复制按钮
        // 知识星球平台按钮定制
        buttonConfig: {
          fillButton: {
            text: '🌟 选择星球发布',
            tooltip: '选择知识星球进行一键发布',
            style: {
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
              color: 'white'
            }
          }
          // 不定义copyButton，因为noCopyButton: true
        }
      },
      priority: 7
    },
    {
      id: 'xiaohongshu',
      name: '小红书平台插件',
      displayName: '小红书',
      enabled: true,
      requiredPlan: 'pro',
      featureId: 'xiaohongshu-platform',
      urlPatterns: [
        'https://creator.xiaohongshu.com/publish/publish*'
      ],
      editorUrl: 'https://creator.xiaohongshu.com/publish/publish?from=tab_switch',
      selectors: {
        title: [
          'input[placeholder*="标题"]',
          'input[placeholder*="请输入标题"]'
        ],
        content: [
          '[contenteditable="true"]',
          '.ql-editor',
          '.ProseMirror'
        ]
      },
      features: ['title', 'content', 'richText'],
      contentType: 'html',
      specialHandling: {
        initDelay: 1500,
        retryOnFail: true,
        retryDelay: 2000,
        buttonConfig: {
          fillButton: { text: '📝 填充内容', tooltip: '填充标题和正文内容到小红书编辑器' },
          copyButton: { text: '📋 复制备用', tooltip: '复制内容以备手动粘贴' }
        }
      },
      priority: 9
    },
    {
      id: 'csdn',
      name: 'CSDN平台插件',
      displayName: 'CSDN',
      enabled: true,
      requiredPlan: 'pro',
      featureId: 'csdn-platform',
      urlPatterns: [
        'https://mp.csdn.net/mp_blog/creation/editor*'
      ],
      editorUrl: 'https://mp.csdn.net/mp_blog/creation/editor',
      selectors: {
        title: [
          'input[placeholder*="标题"]',
          'input[placeholder*="文章标题"]',
          '#articleTitle'
        ],
        content: [
          '.CodeMirror',
          'textarea',
          '[contenteditable="true"]'
        ]
      },
      features: ['title', 'content', 'markdown'],
      contentType: 'markdown',
      specialHandling: {
        initDelay: 1000,
        waitForEditor: true,
        maxWaitTime: 8000,
        retryOnFail: true,
        retryDelay: 1500,
        buttonConfig: {
          fillButton: { text: '💻 填充内容', tooltip: '填充标题和Markdown内容到CSDN编辑器' },
          copyButton: { text: '📋 复制Markdown', tooltip: '复制Markdown格式内容' }
        }
      },
      priority: 8
    }
  ],

  // 服务插件配置
  services: [
    {
      id: 'article-service',
      name: '文章服务',
      enabled: true,
      dependencies: []
    },
    {
      id: 'preset-service',
      name: '预设服务',
      enabled: true,
      dependencies: []
    },
    {
      id: 'publish-service',
      name: '发布服务',
      enabled: true,
      dependencies: ['article-service']
    }
  ],

  // UI组件插件配置
  ui: [
    {
      id: 'panel-manager',
      name: '面板管理器',
      enabled: true,
      dependencies: []
    },
    {
      id: 'button-generator',
      name: '按钮生成器',
      enabled: true,
      dependencies: []
    }
  ],

  // 全局设置
  settings: {
    // 自动注入设置
    autoInject: true,

    // 调试模式
    debug: false,

    // 加载超时时间
    loadTimeout: 10000,

    // 平台检测延迟
    platformDetectionDelay: 1000
  }
};

/**
 * 根据当前URL获取应该加载的平台插件
 */
window.ZiliuPluginConfig.getPluginsForUrl = function (url) {
  return this.platforms.filter(platform => {
    if (!platform.enabled) return false;

    return platform.urlPatterns.some(pattern => {
      try {
        const escapedPattern = pattern
          .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
          .replace(/\*/g, '.*');
        const regex = new RegExp('^' + escapedPattern + '$', 'i');
        return regex.test(url);
      } catch (error) {
        console.warn('URL模式匹配失败:', { pattern, error });
        return false;
      }
    });
  });
};