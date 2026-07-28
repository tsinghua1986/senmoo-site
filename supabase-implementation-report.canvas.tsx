import {
  Stack, Grid, Stat, Table, H1, H2, H3, Text, Divider, Tag, Callout,
  Row, Card, CardHeader, CardBody,
} from 'qoder/canvas';

const fileData = [
  { name: 'supabase/init.sql', type: '新增', desc: '建表 + RLS + 触发器' },
  { name: 'src/lib/supabase.ts', type: '新增', desc: 'Supabase 客户端封装' },
  { name: 'src/components/auth/LoginForm.jsx', type: '新增', desc: '登录表单组件' },
  { name: 'src/components/auth/RegisterForm.jsx', type: '新增', desc: '注册表单组件' },
  { name: 'src/components/admin/AdminLayout.jsx', type: '新增', desc: '管理后台布局' },
  { name: 'src/components/admin/Dashboard.jsx', type: '新增', desc: '仪表盘组件' },
  { name: 'src/components/admin/UserTable.jsx', type: '新增', desc: '用户管理组件' },
  { name: 'src/components/admin/StatsCharts.jsx', type: '新增', desc: '数据统计图表' },
  { name: 'src/components/admin/SettingsForm.jsx', type: '新增', desc: '系统配置表单' },
  { name: 'src/pages/login/index.astro', type: '新增', desc: '登录页面' },
  { name: 'src/pages/register/index.astro', type: '新增', desc: '注册页面' },
  { name: 'src/pages/admin/login.astro', type: '新增', desc: '管理员登录页' },
  { name: 'src/pages/admin/index.astro', type: '替换', desc: '管理仪表盘页' },
  { name: 'src/pages/admin/users.astro', type: '新增', desc: '用户管理页' },
  { name: 'src/pages/admin/stats.astro', type: '新增', desc: '数据统计页' },
  { name: 'src/pages/admin/settings.astro', type: '新增', desc: '系统配置页' },
  { name: '.env.example', type: '新增', desc: '环境变量模板' },
  { name: 'src/components/Nav.jsx', type: '修改', desc: '添加登录/登出按钮' },
  { name: 'products/decision-lens/src/services/api.ts', type: '修改', desc: '添加认证头' },
  { name: 'workers/dl-proxy/index.js', type: '修改', desc: 'JWT校验 + 次数限制' },
  { name: 'src/pages/tools/decision-lens/index.astro', type: '修改', desc: '登录校验' },
];

const pageRoutes = [
  { route: '/login', title: '用户登录', status: '完成' },
  { route: '/register', title: '用户注册', status: '完成' },
  { route: '/admin/login', title: '管理员登录', status: '完成' },
  { route: '/admin', title: '管理仪表盘', status: '完成' },
  { route: '/admin/users', title: '用户管理', status: '完成' },
  { route: '/admin/stats', title: '数据统计', status: '完成' },
  { route: '/admin/settings', title: '系统配置', status: '完成' },
];

export default function SupabaseImplementationReport() {
  return (
    <Stack gap={20}>
      <H1>Supabase 用户系统与后台管理 — 实施报告</H1>
      <Text tone="secondary">
        基于 Supabase 实现完整的用户系统（邮箱注册登录 + 每日使用次数限制）和独立后台管理系统，采用暖光极简风格与主站保持一致。
      </Text>

      <Divider />

      <Grid columns={4} gap={12}>
        <Stat value="17" label="新增文件" tone="success" />
        <Stat value="4" label="修改文件" />
        <Stat value="11" label="构建页面" tone="info" />
        <Stat value="4" label="数据库表" />
      </Grid>

      <Divider />

      <H2>架构概览</H2>
      <Callout tone="info">
        <Text size="small">
          用户浏览器 → Astro SSG 主站（/login, /register, /tools/decision-lens）+ 后台管理（/admin/*）→ Supabase（Auth + PostgreSQL）→ Cloudflare Worker（API 代理 + 次数校验）→ DeepSeek API
        </Text>
      </Callout>

      <Divider />

      <H2>数据库设计</H2>
      <Table
        headers={['表名', '用途', '关键字段']}
        rows={[
          ['profiles', '用户资料扩展', 'id, email, nickname, status'],
          ['usage_logs', '使用记录', 'user_id, decision_type, tokens_used'],
          ['app_config', '系统配置', 'key, value (daily_limit, admin_email...)'],
          ['admin_users', '管理员', 'username, password_hash'],
        ]}
      />

      <Divider />

      <H2>页面路由</H2>
      <Table
        headers={['路由', '页面', '状态']}
        rows={pageRoutes.map(p => [p.route, p.title, p.status])}
        rowTone={pageRoutes.map(() => 'success' as const)}
      />

      <Divider />

      <H2>核心功能实现</H2>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>
            <H3>用户认证</H3>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">Supabase Auth 邮箱 + 密码登录</Text>
              <Text size="small">注册时自动创建 profile（触发器）</Text>
              <Text size="small">导航栏实时显示登录状态</Text>
              <Text size="small">决策透镜需登录后使用</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <H3>次数限制</H3>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">Cloudflare Worker 校验 JWT</Text>
              <Text size="small">查询 usage_logs 计算今日已用次数</Text>
              <Text size="small">超限返回 429 错误</Text>
              <Text size="small">后台可配置每日限制数</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <H3>后台管理</H3>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">独立管理员登录（邮箱验证）</Text>
              <Text size="small">仪表盘：用户数/活跃度/API调用</Text>
              <Text size="small">用户管理：搜索/筛选/封禁/解封</Text>
              <Text size="small">数据统计：DAU/类型分布/调用量</Text>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <H3>RLS 安全策略</H3>
          </CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text size="small">用户只能访问自己的数据</Text>
              <Text size="small">is_admin() 函数判断管理员权限</Text>
              <Text size="small">管理员可查看所有用户和统计</Text>
              <Text size="small">app_config 所有人可读，管理员可写</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>文件变更清单</H2>
      <Table
        headers={['文件路径', '操作', '说明']}
        rows={fileData.map(f => [f.name, f.type, f.desc])}
        rowTone={fileData.map(f => f.type === '修改' ? ('warning' as const) : f.type === '替换' ? ('info' as const) : undefined)}
      />

      <Divider />

      <H2>部署步骤</H2>
      <Stack gap={8}>
        <Row gap={8}><Tag tone="info">1</Tag><Text size="small">在 Supabase 创建项目，运行 supabase/init.sql</Text></Row>
        <Row gap={8}><Tag tone="info">2</Tag><Text size="small">复制 .env.example 为 .env，填入 Supabase URL 和 Anon Key</Text></Row>
        <Row gap={8}><Tag tone="info">3</Tag><Text size="small">在 Cloudflare Worker 设置 DEEPSEEK_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_KEY</Text></Row>
        <Row gap={8}><Tag tone="info">4</Tag><Text size="small">构建并部署：npm run build → 部署到 Cloudflare Pages</Text></Row>
      </Stack>

      <Divider />

      <Text tone="secondary" size="small">
        项目：senmoo-site | 技术栈：Astro 7 + React 18 + Supabase + Cloudflare Workers | 设计风格：暖光极简 (#C67C5B)
      </Text>
    </Stack>
  );
}
