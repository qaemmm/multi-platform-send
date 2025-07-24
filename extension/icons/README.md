# 字流助手图标

## 图标规格

需要创建以下尺寸的PNG图标：
- icon16.png (16x16)
- icon32.png (32x32) 
- icon48.png (48x48)
- icon128.png (128x128)

## 设计建议

图标应该体现"字流"的概念：
- 主色调：蓝色渐变 (#667eea 到 #764ba2)
- 图案：可以是文字流动的抽象图案，或者简单的"字"字图标
- 风格：简洁现代，符合Chrome插件设计规范

## 临时解决方案

在开发阶段，可以：
1. 使用在线图标生成器创建简单的图标
2. 或者从现有的图标库下载合适的图标
3. 确保图标背景透明，适合在各种背景下显示

## SVG模板

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="60" fill="url(#gradient)"/>
  <text x="64" y="80" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">字</text>
</svg>
```

将此SVG保存为文件，然后使用在线工具或图像编辑软件转换为所需尺寸的PNG文件。
