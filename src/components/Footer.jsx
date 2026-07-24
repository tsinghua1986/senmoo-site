import { SITE_CONFIG } from '../config';

export default function Footer() {
  const { social } = SITE_CONFIG;
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href={social.douyin} target="_blank" rel="noopener noreferrer">抖音</a>
        <a href={`mailto:${social.email}`}>邮箱</a>
        <span>微信：{social.wechat}</span>
      </div>
      <p>&copy; {new Date().getFullYear()} Senmoo. All rights reserved.</p>
    </footer>
  );
}
