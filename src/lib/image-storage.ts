// 多图床支持配置
export type ImageStorageProvider = 'r2' | 'qiniu' | 'tencent' | 'aliyun' | 'github';

export interface ImageStorageConfig {
  provider: ImageStorageProvider;
  config: Record<string, any>;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  provider: ImageStorageProvider;
}

// 七牛云配置
export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string; // 自定义域名
  zone?: string; // 存储区域
}

// 腾讯云COS配置
export interface TencentConfig {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  domain?: string; // 自定义域名
}

// 阿里云OSS配置
export interface AliyunConfig {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  domain?: string;
}

// GitHub配置
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  path?: string; // 存储路径前缀
}

// R2配置（现有的）
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}

// 获取当前配置的图床提供商
export function getCurrentProvider(): ImageStorageProvider {
  return (process.env.IMAGE_STORAGE_PROVIDER as ImageStorageProvider) || 'r2';
}

// 获取提供商配置
export function getProviderConfig(provider: ImageStorageProvider): any {
  switch (provider) {
    case 'qiniu':
      return {
        accessKey: process.env.QINIU_ACCESS_KEY,
        secretKey: process.env.QINIU_SECRET_KEY,
        bucket: process.env.QINIU_BUCKET,
        domain: process.env.QINIU_DOMAIN,
        zone: process.env.QINIU_ZONE || 'Zone_z0',
      };
    
    case 'tencent':
      return {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        bucket: process.env.TENCENT_BUCKET,
        region: process.env.TENCENT_REGION,
        domain: process.env.TENCENT_DOMAIN,
      };
    
    case 'aliyun':
      return {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
        bucket: process.env.ALIYUN_BUCKET,
        region: process.env.ALIYUN_REGION,
        domain: process.env.ALIYUN_DOMAIN,
      };
    
    case 'github':
      return {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        branch: process.env.GITHUB_BRANCH || 'main',
        path: process.env.GITHUB_PATH || 'images',
      };
    
    case 'r2':
    default:
      return {
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicUrl: process.env.R2_PUBLIC_URL,
      };
  }
}

// 验证配置是否完整
export function validateConfig(provider: ImageStorageProvider): boolean {
  const config = getProviderConfig(provider);
  
  switch (provider) {
    case 'qiniu':
      return !!(config.accessKey && config.secretKey && config.bucket && config.domain);
    
    case 'tencent':
      return !!(config.secretId && config.secretKey && config.bucket && config.region);
    
    case 'aliyun':
      return !!(config.accessKeyId && config.accessKeySecret && config.bucket && config.region);
    
    case 'github':
      return !!(config.token && config.owner && config.repo);
    
    case 'r2':
      return !!(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucketName);
    
    default:
      return false;
  }
}

// 生成文件路径
export function generateFilePath(fileName: string, provider: ImageStorageProvider): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  // 不同提供商可能有不同的路径策略
  switch (provider) {
    case 'github':
      return `${year}/${month}/${fileName}`;
    
    default:
      return `images/${year}/${month}/${fileName}`;
  }
}

// 成本估算工具
export interface CostEstimate {
  provider: ImageStorageProvider;
  monthlyStorage: number; // GB
  monthlyTraffic: number; // GB
  monthlyCost: number; // USD
  yearlyCost: number; // USD
}

export function estimateCost(
  provider: ImageStorageProvider,
  storageGB: number,
  trafficGB: number
): CostEstimate {
  let monthlyCost = 0;
  
  switch (provider) {
    case 'r2':
      monthlyCost = storageGB * 0.015; // 流量免费
      break;
    
    case 'qiniu':
      monthlyCost = storageGB * 0.021 + Math.max(0, trafficGB - 10) * 0.041; // 10GB流量免费
      break;
    
    case 'tencent':
      monthlyCost = storageGB * 0.014 + trafficGB * 0.021;
      break;
    
    case 'aliyun':
      monthlyCost = storageGB * 0.017 + trafficGB * 0.035;
      break;
    
    case 'github':
      monthlyCost = 0; // 免费，但有限制
      break;
  }
  
  return {
    provider,
    monthlyStorage: storageGB,
    monthlyTraffic: trafficGB,
    monthlyCost,
    yearlyCost: monthlyCost * 12,
  };
}

// 获取所有提供商的成本对比
export function compareAllProviders(storageGB: number, trafficGB: number): CostEstimate[] {
  const providers: ImageStorageProvider[] = ['r2', 'qiniu', 'tencent', 'aliyun', 'github'];
  return providers.map(provider => estimateCost(provider, storageGB, trafficGB));
}
