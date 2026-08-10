import type { ApiConfig } from './types';

/**
 * 开发者内置 API 配置
 * 修改此处即可切换模型/服务商，无需用户手动设置。
 * 
 * 生产环境通过 /dl-proxy 代理转发，API Key 由服务端环境变量提供，
 * 客户端无需暴露 Key。可通过 VITE_API_BASE_URL 环境变量覆盖 API endpoint。
 */
export const API_CONFIG: ApiConfig = {
  provider: 'custom',
  apiKey: '',
  model: import.meta.env.VITE_API_MODEL || 'deepseek-chat',
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
};
