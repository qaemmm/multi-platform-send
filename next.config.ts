import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 环境变量配置
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  },

  // 其他配置
  reactStrictMode: true,

  // 图片域名配置
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },

  webpack: (config) => {
    // vm2 在构建时会尝试可选依赖 coffee-script，直接将其指向空模块避免报错
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'coffee-script': false,
    };
    return config;
  },
};

export default nextConfig;
