// ============================================================
// Senmoo 站点配置
// 控制各模块的显隐和功能开关
// 修改后重新构建即可生效
// ============================================================

export const SITE_CONFIG = {
  // --- 模块显隐 ---
  modules: {
    blog: false,         // 博客模块（暂未开放）
    decisionLens: true,  // 决策透镜入口
    about: true,         // 关于我模块
  },

  // --- 社交链接 ---
  social: {
    douyin: 'https://v.douyin.com/6sc_qiuFiqE/',
    email: 'nanch2018@163.com',
    wechat: 'Benedry',
  },

  // --- 站点元数据 ---
  meta: {
    title: 'Senmoo',
    tagline: '个人AI创意实验室',
    description: '专注打造属于普通人自己的AI产品实验室',
    url: 'https://senmoo.ai',
  },
} as const;
