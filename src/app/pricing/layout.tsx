import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "定价方案",
  description: "字流定价方案 - 免费版支持基础功能，专业版解锁全平台发布、无限存储、专业样式等高级功能。月付仅需19.9元，年付更优惠。",
  keywords: ["字流定价", "内容发布工具定价", "多平台发布价格", "自媒体工具订阅", "公众号编辑器价格"],
  openGraph: {
    title: "字流定价方案 - 专业内容发布工具",
    description: "免费版支持公众号发布，专业版解锁全平台发布、无限存储、专业样式。月付19.9元起，年付更优惠。",
    url: "https://ziliu.online/pricing",
    images: [
      {
        url: "/pricing-og.jpg",
        width: 1200,
        height: 630,
        alt: "字流定价方案",
      },
    ],
  },
  twitter: {
    title: "字流定价方案 - 专业内容发布工具",
    description: "免费版支持公众号发布，专业版解锁全平台发布。月付19.9元起。",
  },
  alternates: {
    canonical: "https://ziliu.online/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}