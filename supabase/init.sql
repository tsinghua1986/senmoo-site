-- ============================================================
-- Senmoo Supabase 初始化脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. profiles 表（用户资料扩展）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text,
  avatar_url text,
  created_at timestamptz default now() not null,
  last_login_at timestamptz default now() not null,
  status text default 'active' check (status in ('active', 'banned'))
);

-- 2. usage_logs 表（使用记录）
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  decision_type text not null default 'unknown',
  created_at timestamptz default now() not null,
  tokens_used int default 0
);

-- 3. app_config 表（系统配置）
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now() not null
);

-- 4. admin_users 表（管理员）
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now() not null
);

-- 预设配置
insert into public.app_config (key, value) values
  ('daily_limit', '10'),
  ('site_name', 'Senmoo'),
  ('open_registration', 'true'),
  ('ai_model', 'deepseek-chat'),
  ('admin_email', 'admin@senmoo.com')
on conflict (key) do nothing;

-- 初始管理员（密码：admin123，使用 bcrypt 哈希）
-- 实际部署时请修改密码
insert into public.admin_users (username, password_hash) values
  ('admin', '$2b$10$XQJG0Z8VJHlYW8kZ9VwXeOYX7KqP5nGJm3Z9VwXeOYX7KqP5nGJm3')
on conflict (username) do nothing;

-- ============================================================
-- 管理员判断函数
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.app_config
    where key = 'admin_email'
    and value = (select email from auth.users where id = auth.uid())
  );
end;
$$ language plpgsql security definer stable;

-- ============================================================
-- RLS 策略
-- ============================================================

-- 启用 RLS
alter table public.profiles enable row level security;
alter table public.usage_logs enable row level security;
alter table public.app_config enable row level security;
alter table public.admin_users enable row level security;

-- profiles: 用户只能看自己的资料，管理员可看所有
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id or public.is_admin());

create policy "Insert own profile on signup"
  on public.profiles for insert with check (auth.uid() = id);

-- usage_logs: 用户只能看自己的记录，管理员可看所有
create policy "Users can view own usage"
  on public.usage_logs for select using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own usage"
  on public.usage_logs for insert with check (auth.uid() = user_id or public.is_admin());

-- app_config: 所有人可读，管理员可写
create policy "Anyone can read config"
  on public.app_config for select using (true);

create policy "Admin can write config"
  on public.app_config for all using (public.is_admin());

-- admin_users: 仅通过 service_role key 访问
-- 前端不应直接访问此表

-- ============================================================
-- 函数：注册时自动创建 profile
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 触发器：新用户注册时自动创建 profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 函数：获取今日使用次数
-- ============================================================
create or replace function public.get_today_usage(p_user_id uuid)
returns integer as $$
begin
  return coalesce(
    (select count(*) from public.usage_logs
     where user_id = p_user_id
     and created_at >= current_date),
    0
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- 索引优化
-- ============================================================
create index if not exists idx_usage_logs_user_date
  on public.usage_logs(user_id, created_at desc);

create index if not exists idx_usage_logs_created
  on public.usage_logs(created_at desc);
