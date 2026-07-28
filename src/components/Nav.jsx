import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config';
import { supabase } from '../lib/supabase';

export default function Nav({ currentPath = '/' }) {
  const allLinks = [
    { label: '首页', href: '/', always: true },
    { label: '关于我', href: '/about', module: 'about' },
    { label: 'AI产品', href: '/tools', module: 'decisionLens' },
  ];
  const navLinks = allLinks.filter(
    (link) => link.always || SITE_CONFIG.modules[link.module]
  );
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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
            <a href="/login" className="nav-auth-btn">登录</a>
            <a href="/register" className="nav-auth-btn nav-auth-register">注册</a>
          </>
        )}
      </div>
    </nav>
  );
}
