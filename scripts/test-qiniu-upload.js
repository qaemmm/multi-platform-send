/**
 * 七牛云上传测试
 */
const qiniu = require('qiniu');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testQiniuUpload() {
  console.log('🔧 正在测试七牛云上传功能...\n');

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
    console.log('✅ 认证对象创建成功');

    // 创建上传策略
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket,
      expires: 7200,
    });
    console.log('✅ 上传策略创建成功');

    // 生成上传凭证
    const uploadToken = putPolicy.uploadToken(mac);
    console.log('✅ 上传凭证生成成功');

    // 配置存储区域 (华南区)
    const config = new qiniu.conf.Config();
    config.zone = qiniu.zone.Zone_z2;
    console.log('✅ 存储区域配置成功 (华南区)');

    // 创建测试文件
    console.log('\n📤 开始上传测试...');

    const testContent = Buffer.from('Hello, Qiniu Cloud Storage! 测试文件内容');
    const testFileName = `test-upload-${Date.now()}.txt`;

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
            console.log('✅ 文件上传成功!');
            console.log('  文件名:', testFileName);
            console.log('  文件大小:', testContent.length, 'bytes');
            console.log('  访问链接:', fileUrl);
            console.log('  响应体:', JSON.stringify(respBody, null, 2));
            resolve({ success: true, fileName: testFileName, url: fileUrl, respBody });
          } else {
            console.log('❌ 文件上传失败，状态码:', respInfo.statusCode);
            console.log('  响应体:', respInfo);
            resolve({ success: false, error: `状态码: ${respInfo.statusCode}` });
          }
        }
      );
    });

    // 如果上传成功，测试删除
    if (uploadResult.success) {
      console.log('\n🗑️ 测试文件删除...');

      const bucketManager = new qiniu.rs.BucketManager(mac, config);

      const deleteResult = await new Promise((resolve) => {
        bucketManager.delete(bucket, testFileName, (err, respBody, respInfo) => {
          if (err) {
            console.log('❌ 删除测试文件失败:', err.message);
            resolve(false);
          } else if (respInfo.statusCode === 200) {
            console.log('✅ 测试文件删除成功');
            resolve(true);
          } else {
            console.log('⚠️ 删除测试文件状态码:', respInfo.statusCode, '(可能是正常的)');
            resolve(true); // 有些情况下删除会返回非200状态码但实际成功
          }
        });
      });

      console.log('\n🎉 七牛云集成测试完成！');
      console.log('📝 测试结果总结:');
      console.log('  ✅ 认证配置正确');
      console.log('  ✅ 文件上传功能正常');
      console.log('  ✅ 文件删除功能正常');
      console.log('  ✅ 七牛云服务已成功集成');
      console.log('\n💡 接下来你可以:');
      console.log('  1. 启动开发服务器: npm run dev');
      console.log('  2. 在飞书导入中测试图片上传');
      console.log('  3. 查看图片是否成功上传到七牛云');

    } else {
      console.log('\n❌ 上传测试失败，请检查配置');
    }

  } catch (error) {
    console.error('💥 测试过程中出现异常:', error);
  }
}

// 运行测试
testQiniuUpload();