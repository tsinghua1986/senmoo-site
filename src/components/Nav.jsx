import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config';
import { supabase } from '../lib/supabase';
import AuthModal from './auth/AuthModal';

export default function Nav({ currentPath = '/' }) {
  const allLinks = [
    { label: '首页', href: '/', always: true },
    { label: '关于我', href: '/about', dynamic: 'show_about' },
    { label: 'AI产品', href: '/tools', module: 'decisionLens' },
  ];
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'

  const navLinks = allLinks.filter(
    (link) => link.always || (link.dynamic === 'show_about' ? showAbout : SITE_CONFIG.modules[link.module])
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 从后台配置读取“关于我”显隐开关（默认隐藏）
  useEffect(() => {
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'show_about')
      .single()
      .then(({ data }) => {
        setShowAbout(data?.value === 'true');
      })
      .catch(() => setShowAbout(false));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (href) => {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  };

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-left">
          <a href="/" className="nav-logo">Senmoo</a>
          <div className="nav-links">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link${isActive(link.href) ? ' active' : ''}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-user-email">{user.email}</span>
              <button onClick={handleLogout} className="nav-auth-btn nav-auth-logout">登出</button>
            </>
          ) : (
            <>
              <button onClick={() => setAuthModal('login')} className="nav-auth-btn">登录</button>
              <button onClick={() => setAuthModal('register')} className="nav-auth-btn nav-auth-register">注册</button>
            </>
          )}
        </div>
      </nav>
      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} />
      )}
    </>
  );
}
