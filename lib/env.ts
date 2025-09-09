/**
 * 环境配置工具函数
 * 根据当前环境自动选择开发或生产配置
 */

// 获取当前环境
export const getEnvironment = (): 'development' | 'production' => {
  // 优先使用 NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // 如果没有设置 NODE_ENV，根据其他环境变量判断
  // 检查是否在生产环境（通过端口或域名判断）
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    return 'production';
  }
  
  // 默认为开发环境
  return 'development';
};

// 获取API基础URL
export const getApiBaseUrl = (): string => {
  const env = getEnvironment();
  
  if (env === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://192.168.2.124:3001/api';
  } else {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  }
};

// 获取应用基础URL
export const getAppBaseUrl = (): string => {
  const env = getEnvironment();
  
  if (env === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://192.168.2.124:3001';
  } else {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
};

// 获取完整的环境配置
export const getEnvConfig = () => {
  const env = getEnvironment();
  
  return {
    environment: env,
    apiBaseUrl: getApiBaseUrl(),
    appBaseUrl: getAppBaseUrl(),
    isDevelopment: env === 'development',
    isProduction: env === 'production',
  };
};

// 导出环境配置常量
export const ENV_CONFIG = getEnvConfig();

// 日志输出当前环境配置（仅在开发环境）
if (typeof window === 'undefined' && ENV_CONFIG.isDevelopment) {
  console.log('🌍 当前环境配置:', ENV_CONFIG);
}