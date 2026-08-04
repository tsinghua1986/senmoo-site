import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwkqotkazgqpzqtjecvu.supabase.co';
const supabaseAnonKey = 'sb_publishable_yHdsg6K1ZON8QghpuhpElA_cptNP2MG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 获取当前用户会话
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 获取当前用户
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// 邮箱注册
export async function signUp(email: string, password: string, nickname?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname: nickname || '' },
    },
  });
  return { data, error };
}

// 邮箱登录
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

// 登出
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 获取今日使用次数（按北京时间 UTC+8 计算）
export async function getTodayUsage(userId: string): Promise<number> {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const today = beijingTime.toISOString().split('T')[0];
  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today);

  if (error) return 0;
  return count || 0;
}

// 获取每日限制配置
export async function getDailyLimit(): Promise<number> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'daily_limit')
    .single();

  if (error) return 10;
  return parseInt(data?.value ?? '10', 10) || 10;
}
