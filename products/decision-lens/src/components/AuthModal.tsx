import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qwkqotkazgqpzqtjecvu.supabase.co',
  'sb_publishable_yHdsg6K1ZON8QghpuhpElA_cptNP2MG'
);

// 管理员邮箱列表，禁止前端注册
const ADMIN_EMAILS = ['admin@senmoo.com'];

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setTimeout(() => onAuthSuccess(), 500);
      }
    } else {
      if (password !== confirmPassword) {
        setError('两次密码不一致');
        setLoading(false);
        return;
      }
      if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        setError('该邮箱不可注册');
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
        setTimeout(() => onAuthSuccess(), 500);
      }
    }
  };

  return (
    <div
      className="dl-auth-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dl-auth-card">
        <button className="dl-auth-close" onClick={onClose} aria-label="关闭" />

        <div className="dl-auth-tabs">
          <button
            className={`dl-auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
          >
            登录
          </button>
          <button
            className={`dl-auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
          >
            注册
          </button>
        </div>

        {error && <div className="dl-auth-error">{error}</div>}
        {success && <div className="dl-auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="dl-auth-form">
          {mode === 'register' && (
            <div className="dl-auth-field">
              <label>昵称（选填）</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
              />
            </div>
          )}

          <div className="dl-auth-field">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="dl-auth-field">
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
            <div className="dl-auth-field">
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

          <button type="submit" className="dl-auth-btn" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登  录' : '注  册'}
          </button>
        </form>
      </div>
    </div>
  );
}
