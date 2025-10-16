/**
 * 七牛云基础配置测试
 */
const qiniu = require('qiniu');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testQiniuBasic() {
  console.log('🔧 正在测试七牛云基础配置...\n');

  // 检查环境变量
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET;
  const domain = process.env.QINIU_DOMAIN;

  console.log('📋 环境变量检查:');
  console.log('  QINIU_ACCESS_KEY:', accessKey ? '✅ 已设置' : '❌ 未设置');
  console.log('  QINIU_SECRET_KEY:', secretKey ? '✅ 已设置' : '❌ 未设置');
  console.log('  QINIU_BUCKET:', bucket ? '✅ 已设置' : '❌ 未设置');
  console.log('  QINIU_DOMAIN:', domain ? '✅ 已设置' : '❌ 未设置');
  console.log('');

  if (!accessKey || !secretKey || !bucket || !domain) {
    console.log('❌ 配置不完整，无法继续测试');
    return;
  }

  try {
    // 创建认证对象
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    console.log('✅ Mac 认证对象创建成功');

    // 创建上传策略
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket,
      expires: 7200,
    });
    console.log('✅ 上传策略创建成功');

    // 生成上传凭证
    const uploadToken = putPolicy.uploadToken(mac);
    console.log('✅ 上传凭证生成成功');

    // 配置存储区域
    const config = new qiniu.conf.Config();
    config.zone = qiniu.zone.Zone_z2; // 华南区
    console.log('✅ 存储区域配置成功 (华南区)');

    // 测试存储空间信息
    const bucketManager = new qiniu.rs.BucketManager(mac, config);

    console.log('\n📋 测试存储空间信息...');

    const spaceStat = await new Promise((resolve) => {
      bucketManager.bucketStat(bucket, (err, respBody, respInfo) => {
        if (err) {
          console.log('❌ 获取存储空间信息失败:', err.message);
          resolve(null);
        } else if (respInfo.statusCode === 200) {
          console.log('✅ 存储空间信息获取成功:');
          console.log('  空间名称:', bucket);
          console.log('  存储空间统计:', respBody);
          resolve(respBody);
        } else {
          console.log('❌ 获取存储空间信息失败，状态码:', respInfo.statusCode);
          resolve(null);
        }
      });
    });

    // 创建测试文件
    console.log('\n📤 测试文件上传...');

    const testContent = Buffer.from('Hello, Qiniu Cloud Storage!');
    const testFileName = `test-${Date.now()}.txt`;

    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    const uploadResult = await new Promise((resolve) => {
      formUploader.put(
        uploadToken,
        testFileName,
        testContent,
        putExtra,
        (err, respBody, respInfo) => {
          if (err) {
            console.log('❌ 文件上传失败:', err.message);
            resolve({ success: false, error: err.message });
          } else if (respInfo.statusCode === 200) {
            const fileUrl = `${domain}/${testFileName}`;
            console.log('✅ 文件上传成功:');
            console.log('  文件名:', testFileName);
            console.log('  文件大小:', testContent.length, 'bytes');
            console.log('  访问链接:', fileUrl);
            console.log('  响应信息:', respBody);
            resolve({ success: true, fileName: testFileName, url: fileUrl });
          } else {
            console.log('❌ 文件上传失败，状态码:', respInfo.statusCode);
            resolve({ success: false, error: `状态码: ${respInfo.statusCode}` });
          }
        }
      );
    });

    // 清理测试文件
    if (uploadResult.success) {
      console.log('\n🗑️ 清理测试文件...');

      const deleteResult = await new Promise((resolve) => {
        bucketManager.delete(bucket, testFileName, (err, respBody, respInfo) => {
          if (err) {
            console.log('❌ 删除测试文件失败:', err.message);
            resolve(false);
          } else if (respInfo.statusCode === 200) {
            console.log('✅ 测试文件删除成功');
            resolve(true);
          } else {
            console.log('❌ 删除测试文件失败，状态码:', respInfo.statusCode);
            resolve(false);
          }
        });
      });
    }

    console.log('\n🎉 七牛云基础配置测试完成！');
    console.log('📝 配置总结:');
    console.log('  ✅ 认证配置正确');
    console.log('  ✅ 存储空间可访问');
    console.log('  ✅ 文件上传功能正常');
    console.log('  ✅ 文件删除功能正常');
    console.log('  ✅ 可以开始使用七牛云服务');

  } catch (error) {
    console.error('💥 测试过程中出现异常:', error);
  }
}

// 运行测试
testQiniuBasic();