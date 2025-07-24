import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 计算阅读时间（基于字数，中文按字符计算，英文按单词计算）
export function calculateReadingTime(content: string): number {
  // 中文字符数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词数
  const englishWords = content.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(word => word.length > 0).length;
  
  // 中文阅读速度约300字/分钟，英文约200词/分钟
  const readingTime = Math.ceil((chineseChars / 300) + (englishWords / 200));
  return Math.max(1, readingTime); // 至少1分钟
}

// 计算字数
export function countWords(content: string): number {
  // 中文字符数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 英文单词数
  const englishWords = content.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(word => word.length > 0).length;
  
  return chineseChars + englishWords;
}

// 格式化日期
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// 格式化相对时间
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return '刚刚';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}分钟前`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}小时前`;
  } else if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  } else {
    return formatDate(date);
  }
}
