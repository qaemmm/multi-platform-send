import { v4 as uuidv4 } from 'uuid';

// 动态导入七牛云SDK，避免SSR问题
let qiniu: any = null;

// 服务端环境检查
const isServer = typeof window === 'undefined';

// 动态加载七牛云SDK
async function loadQiniuSDK() {
  if (!qiniu && isServer) {
    try {
      // 尝试多种方式加载七牛云SDK
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 尝试加载七牛云SDK...');
      }

      // 方法1: 动态导入
      try {
        const qiniuModule = await import('qiniu');
        qiniu = qiniuModule.default || qiniuModule;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Qiniu SDK loaded via dynamic import');
        }
        return qiniu;
      } catch (dynamicImportError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Dynamic import failed:', dynamicImportError);
        }
      }

      // 方法2: 使用eval require (仅在服务端)
      try {
        if (typeof eval === 'function' && typeof eval('require') === 'function') {
          qiniu = eval('require')('qiniu');
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Qiniu SDK loaded via eval require');
          }
          return qiniu;
        }
      } catch (evalRequireError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Eval require failed:', evalRequireError);
        }
      }

      // 方法3: 使用global.require (Node.js环境)
      try {
        if (typeof global !== 'undefined' && global.require) {
          qiniu = global.require('qiniu');
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Qiniu SDK loaded via global.require');
          }
          return qiniu;
        }
      } catch (globalRequireError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Global require failed:', globalRequireError);
        }
      }

      console.error('❌ All attempts to load Qiniu SDK failed');
      return null;

    } catch (error) {
      console.error('❌ Failed to load Qiniu SDK:', error);
      return null;
    }
  }
  return qiniu;
}

export interface QiniuUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  uploadPath?: string;
  error?: string;
}

export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string; // 七牛云域名，如 https://gds-gwh.s3.cn-south-1.qiniucs.com
  zone?: 'Zone_z0' | 'Zone_z1' | 'Zone_z2' | 'Zone_na0' | 'Zone_as0'; // 存储区域
}

/**
 * 七牛云存储服务类
 */
export class QiniuStorageService {
  private mac: any;
  private config: QiniuConfig;
  private putPolicy: any;
  private qiniuInstance: any = null;

  constructor(config: QiniuConfig) {
    this.config = config;
  }

  /**
   * 初始化七牛云SDK
   */
  private async initQiniu() {
    if (this.qiniuInstance) return this.qiniuInstance;

    console.log('🔧 初始化七牛云SDK...');
    console.log('📋 配置信息:', {
      accessKey: this.config.accessKey?.substring(0, 8) + '...',
      bucket: this.config.bucket,
      domain: this.config.domain,
      zone: this.config.zone
    });

    const qiniuSDK = await loadQiniuSDK();
    if (!qiniuSDK) {
      throw new Error('Failed to load Qiniu SDK');
    }

    this.qiniuInstance = qiniuSDK;

    try {
      this.mac = new qiniuSDK.auth.digest.Mac(this.config.accessKey, this.config.secretKey);
      this.putPolicy = new qiniuSDK.rs.PutPolicy({
        scope: this.config.bucket,
        expires: 7200, // 2小时过期
      });
      console.log('✅ 七牛云SDK初始化成功');
    } catch (initError) {
      console.error('❌ 七牛云SDK初始化失败:', initError);
      throw initError;
    }

    return this.qiniuInstance;
  }

  /**
   * 生成上传凭证
   */
  private async generateUploadToken(): Promise<string> {
    await this.initQiniu();
    return this.putPolicy.uploadToken(this.mac);
  }

  /**
   * 获取配置信息
   */
  private async getConfig() {
    const qiniuSDK = await this.initQiniu();

    // 根据存储区域设置配置
    const configObj = new qiniuSDK.conf.Config();

    // 设置存储区域
    switch (this.config.zone) {
      case 'Zone_z0':
        configObj.zone = qiniuSDK.zone.Zone_z0; // 华东
        break;
      case 'Zone_z1':
        configObj.zone = qiniuSDK.zone.Zone_z1; // 华北
        break;
      case 'Zone_z2':
        configObj.zone = qiniuSDK.zone.Zone_z2; // 华南
        break;
      case 'Zone_na0':
        configObj.zone = qiniuSDK.zone.Zone_na0; // 北美
        break;
      case 'Zone_as0':
        configObj.zone = qiniuSDK.zone.Zone_as0; // 东南亚
        break;
      default:
        configObj.zone = qiniuSDK.zone.Zone_z0; // 默认华东
    }

    return configObj;
  }

  /**
   * 上传文件到七牛云
   */
  async uploadFile(
    file: File | Blob,
    fileName: string,
    customPath?: string
  ): Promise<QiniuUploadResult> {
    try {
      const qiniuSDK = await this.initQiniu();

      // 生成唯一文件名
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;

      // 生成文件路径
      const filePath = customPath ||
        `images/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueFileName}`;

      // 生成上传凭证
      const uploadToken = await this.generateUploadToken();

      // 配置上传参数
      const config = await this.getConfig();
      const formUploader = new qiniuSDK.form_up.FormUploader(config);
      const putExtra = new qiniuSDK.form_up.PutExtra();

      // 将 File/Blob 转换为 Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 执行上传
      const result = await new Promise<QiniuUploadResult>((resolve) => {
        formUploader.put(
          uploadToken,
          filePath,
          buffer,
          putExtra,
          (respErr: any, respBody: any, respInfo: any) => {
            if (respErr) {
              console.error('七牛云上传失败:', respErr);
              resolve({
                success: false,
                error: respErr.message || '上传失败'
              });
              return;
            }

            if (respInfo.statusCode === 200) {
              // 构建访问URL
              const publicUrl = `${this.config.domain}/${filePath}`;

              resolve({
                success: true,
                url: publicUrl,
                fileName,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                uploadPath: filePath
              });
            } else {
              console.error('七牛云上传失败，状态码:', respInfo.statusCode);
              resolve({
                success: false,
                error: `上传失败，状态码: ${respInfo.statusCode}`
              });
            }
          }
        );
      });

      return result;

    } catch (error) {
      console.error('七牛云上传异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传异常'
      };
    }
  }

  /**
   * 从URL下载图片并上传到七牛云
   */
  async uploadFromUrl(imageUrl: string): Promise<QiniuUploadResult> {
    try {
      // 下载图片
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `下载失败: ${response.status} ${response.statusText}`
        };
      }

      const blob = await response.blob();

      // 从URL提取文件名
      const urlParts = imageUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1] || 'image.jpg';
      const cleanFileName = lastPart.split('?')[0] || 'image.jpg';

      // 确保有文件扩展名
      const fileName = cleanFileName.includes('.') ? cleanFileName : `${cleanFileName}.jpg`;

      return await this.uploadFile(blob, fileName);

    } catch (error) {
      console.error('从URL上传到七牛云失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      };
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const qiniuSDK = await this.initQiniu();
      const config = await this.getConfig();
      const bucketManager = new qiniuSDK.rs.BucketManager(this.mac, config);

      return new Promise((resolve) => {
        bucketManager.delete(this.config.bucket, filePath, (err: any, respBody: any, respInfo: any) => {
          if (err) {
            console.error('七牛云删除文件失败:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (respInfo.statusCode === 200) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `删除失败，状态码: ${respInfo.statusCode}`
            });
          }
        });
      });

    } catch (error) {
      console.error('七牛云删除文件异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除异常'
      };
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const qiniuSDK = await this.initQiniu();
      const config = await this.getConfig();
      const bucketManager = new qiniuSDK.rs.BucketManager(this.mac, config);

      return new Promise((resolve) => {
        bucketManager.stat(this.config.bucket, filePath, (err: any, respBody: any, respInfo: any) => {
          if (err) {
            console.error('七牛云获取文件信息失败:', err);
            resolve({ success: false, error: err.message });
            return;
          }

          if (respInfo.statusCode === 200) {
            resolve({ success: true, data: respBody });
          } else {
            resolve({
              success: false,
              error: `获取文件信息失败，状态码: ${respInfo.statusCode}`
            });
          }
        });
      });

    } catch (error) {
      console.error('七牛云获取文件信息异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件信息异常'
      };
    }
  }
}

/**
 * 创建七牛云存储服务实例
 */
export function createQiniuStorageService(): QiniuStorageService | null {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET;
  const domain = process.env.QINIU_DOMAIN;
  const zone = process.env.QINIU_ZONE as QiniuConfig['zone'] || 'Zone_z0';

  console.log('🔧 检查七牛云配置...');
  console.log('📋 环境变量状态:', {
    accessKey: accessKey ? '✅ 已设置' : '❌ 未设置',
    secretKey: secretKey ? '✅ 已设置' : '❌ 未设置',
    bucket: bucket ? '✅ 已设置' : '❌ 未设置',
    domain: domain ? '✅ 已设置' : '❌ 未设置',
    zone: zone
  });

  if (!accessKey || !secretKey || !bucket || !domain) {
    console.warn('❌ 七牛云配置不完整，跳过七牛云服务初始化');
    return null;
  }

  console.log('✅ 七牛云配置完整，创建服务实例');
  return new QiniuStorageService({
    accessKey,
    secretKey,
    bucket,
    domain,
    zone
  });
}