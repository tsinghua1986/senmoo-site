import type { ApiConfig } from './types';

/**
 * 开发者内置 API 配置
 * 修改此处即可切换模型/服务商，无需用户手动设置。
 * 
 * 生产环境可通过 VITE_API_BASE_URL 环境变量覆盖 API endpoint
 * （例如指向 Cloudflare Worker 代理）
 */
export const API_CONFIG: ApiConfig = {
  provider: 'custom',
  apiKey: import.meta.env.VITE_API_KEY || 'sk-1146afeb19f74274b55b9ebb0e9eb00b',
  model: import.meta.env.VITE_API_MODEL || 'deepseek-chat',
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
};
