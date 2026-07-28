import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayActive: 0,
    todayApiCalls: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 总用户数
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 今日活跃用户
      const { data: activeData } = await supabase
        .from('usage_logs')
        .select('user_id')
        .gte('created_at', today)
        .then(({ data }) => ({ data }));
      const todayActive = new Set((activeData || []).map(d => d.user_id)).size;

      // 今日API调用
      const { count: todayApiCalls } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // 最近注册用户
      const { data: users } = await supabase
        .from('profiles')
        .select('email, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalUsers: totalUsers ?? 0,
        todayActive,
        todayApiCalls: todayApiCalls ?? 0,
      });
      setRecentUsers(users || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="admin-page-loading">加载中...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>仪表盘</h1>
        <p>系统概览</p>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">◉</div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{stats.totalUsers}</span>
            <span className="admin-stat-label">总用户数</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">◈</div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{stats.todayActive}</span>
            <span className="admin-stat-label">今日活跃</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">◰</div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{stats.todayApiCalls}</span>
            <span className="admin-stat-label">今日API调用</span>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2>最近注册用户</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>邮箱</th>
                <th>注册时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr><td colSpan="3" className="admin-table-empty">暂无用户</td></tr>
              ) : (
                recentUsers.map((u) => (
                  <tr key={u.email}>
                    <td>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                    <td>
                      <span className={`admin-status ${u.status === 'active' ? 'active' : 'banned'}`}>
                        {u.status === 'active' ? '正常' : '封禁'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
