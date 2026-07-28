import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname: nickname || '' },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('该邮箱已注册');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    setSuccess('注册成功！请检查邮箱验证后登录。');
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <a href="/" className="nav-logo">Senmoo</a>
        </div>
        <h1 className="auth-title">创建新账户</h1>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱</label>
            <input
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">昵称（选填）</label>
            <input
              type="text"
              className="auth-input"
              placeholder="你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">密码（至少6位）</label>
            <input
              type="password"
              className="auth-input"
              placeholder="设置密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">确认密码</label>
            <input
              type="password"
              className="auth-input"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? '注册中...' : '注  册'}
          </button>
        </form>

        <p className="auth-footer">
          已有账号？<a href="/login">登录</a>
        </p>
      </div>
    </div>
  );
}
