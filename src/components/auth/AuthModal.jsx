import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthModal({ mode: initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message.includes('Invalid') ? '邮箱或密码错误' : signInError.message);
        setLoading(false);
      } else {
        setSuccess('登录成功');
        setTimeout(() => onClose?.(), 500);
      }
    } else {
      if (password !== confirmPassword) {
        setError('两次密码不一致');
        setLoading(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: nickname || '' } },
      });
      if (signUpError) {
        setError(signUpError.message.includes('already') ? '该邮箱已注册' : signUpError.message);
        setLoading(false);
      } else {
        setSuccess('注册成功');
        setTimeout(() => onClose?.(), 500);
      }
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="auth-modal-card">
        <button className="auth-modal-close" onClick={onClose} aria-label="关闭"></button>

        <div className="auth-modal-tabs">
          <button
            className={`auth-modal-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            className={`auth-modal-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        {error && <div className="auth-modal-error">{error}</div>}
        {success && <div className="auth-modal-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {mode === 'register' && (
            <div className="auth-modal-field">
              <label>昵称（选填）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
              />
            </div>
          )}

          <div className="auth-modal-field">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="auth-modal-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div className="auth-modal-field">
              <label>确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
                required
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="auth-modal-submit" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登  录' : '注  册'}
          </button>
        </form>
      </div>
    </div>
  );
}
