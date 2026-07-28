import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const NAV_ITEMS = [
  { label: '仪表盘', href: '/admin', icon: '◫' },
  { label: '用户管理', href: '/admin/users', icon: '◉' },
  { label: '数据统计', href: '/admin/stats', icon: '◰' },
  { label: '系统配置', href: '/admin/settings', icon: '⚙' },
];

export default function AdminLayout({ currentPath = '/admin', children }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/admin/login';
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/admin/login';
      return;
    }
    // 检查是否是管理员（通过 user_metadata 中的 is_admin 标记判断）
    // user_metadata 只能通过 Supabase Dashboard 或 service_role key 设置
    // 前端注册的用户不会有此标记，即使知道管理员邮箱也无法进入
    const isAdmin = session.user?.user_metadata?.is_admin === true;
    if (!isAdmin) {
      alert('无管理员权限');
      await supabase.auth.signOut();
      window.location.href = '/admin/login';
      return;
    }
    setIsAuthed(true);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <h2>Senmoo Admin</h2>
          <p>后台管理系统</p>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`admin-nav-item${currentPath === item.href ? ' active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-item">← 返回主站</a>
          <button onClick={handleLogout} className="admin-nav-item admin-logout-btn">
            退出登录
          </button>
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
