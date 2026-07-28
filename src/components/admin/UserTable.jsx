import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;
      if (!error) {
        setUsers(data ?? []);
        setTotalCount(count ?? 0);
      }
    } catch (err) {
      console.error('Load users error:', err);
    }
    setLoading(false);
  };

  const handleBanToggle = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.nickname && u.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>用户管理</h1>
        <p>管理所有注册用户</p>
      </div>

      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search"
          placeholder="搜索邮箱或昵称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">封禁</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>昵称</th>
              <th>注册日期</th>
              <th>最后登录</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="admin-table-empty">加载中...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="6" className="admin-table-empty">暂无用户</td></tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.nickname || '-'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('zh-CN') : '-'}</td>
                  <td>
                    <span className={`admin-status ${u.status === 'active' ? 'active' : 'banned'}`}>
                      {u.status === 'active' ? '正常' : '封禁'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`admin-btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleBanToggle(u.id, u.status)}
                    >
                      {u.status === 'active' ? '封禁' : '解封'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span>第 {page} / {totalPages} 页，共 {totalCount} 条</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      )}
    </div>
  );
}
