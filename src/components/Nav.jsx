import { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config';

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    </nav>
  );
}
