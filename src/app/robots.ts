import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/editor/',
          '/admin/',
          '/api/',
          '/debug/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/editor/', 
          '/admin/',
          '/api/',
          '/debug/',
        ],
      },
    ],
    sitemap: 'https://ziliu.online/sitemap.xml',
    host: 'https://ziliu.online',
  };
}