#!/usr/bin/env node
/**
 * 快速测试新域名是否能正常工作
 */

async function quickTestDomain() {
  console.log('🧪 快速测试域名: cdn.huiouye.top');

  const testUrl = 'http://cdn.huiouye.top/favicon.ico';

  try {
    console.log('📍 尝试访问:', testUrl);

    const response = await fetch(testUrl, {
      method: 'HEAD',
      timeout: 10000
    });

    if (response.ok) {
      console.log('✅ 域名可以访问！');
      console.log('📊 状态码:', response.status);
      console.log('📋 响应头:');

      // 显示一些重要的响应头
      const headers = [
        'server',
        'content-type',
        'content-length',
        'access-control-allow-origin',
        'cache-control'
      ];

      headers.forEach(header => {
        const value = response.headers.get(header);
        if (value) {
          console.log(`   ${header}: ${value}`);
        }
      });

      console.log('\n🎯 域名配置成功！现在可以配置到项目中了');
      console.log('\n请在 .env 文件中设置：');
      console.log('QINIU_DOMAIN="http://cdn.huiouye.top"');
      console.log('IMAGE_STORAGE_PROVIDER="qiniu"');

    } else {
      console.log('❌ 域名访问失败，状态码:', response.status);

      if (response.status === 404) {
        console.log('💡 这可能是正常的，因为favicon.ico不存在');
        console.log('🎯 域名本身是工作的，可以配置使用了！');
      } else {
        console.log('❌ 域名配置有问题，请检查：');
        console.log('1. 七牛云控制台是否正确绑定了域名');
        console.log('2. DNS解析是否生效');
        console.log('3. 域名是否在七牛云中启用');
      }
    }
  } catch (error) {
    console.log('❌ 访问失败:', error.message);
    console.log('💡 可能的原因：');
    console.log('1. DNS解析未生效');
    console.log('2. 网络连接问题');
    console.log('3. 域名配置错误');
  }

  // 测试上传功能（如果环境变量允许）
  console.log('\n📤 测试上传功能...');

  try {
    // 模拟图片上传到当前运行的应用
    const testResponse = await fetch('http://localhost:3000/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 这里需要实际的图片数据，但我们只是测试API是否可用
        test: true
      }),
      timeout: 5000
    });

    if (testResponse.ok || testResponse.status === 401) {
      console.log('✅ 上传API可以访问');
      if (testResponse.status === 401) {
        console.log('   (401错误是正常的，说明需要认证)');
      }
    } else {
      console.log('❌ 上传API可能有问题，状态码:', testResponse.status);
    }
  } catch (apiError) {
    console.log('⚠️  无法测试上传API，可能开发服务器未运行');
    console.log('   请确保运行: npm run dev');
  }
}

quickTestDomain().catch(console.error);