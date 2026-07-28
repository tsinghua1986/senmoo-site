import { SITE_CONFIG } from '../config';

export default function Footer() {
  const { social } = SITE_CONFIG;
  return (
    <footer className="footer">
      <div className="footer-contact">
        <div className="footer-contact-label-en">Contact</div>
        <div className="footer-contact-title">联系我</div>
        <p className="footer-contact-desc">欢迎加入社群交流AI产品、内容创作、或其他任何想法。</p>
        <div className="footer-contact-grid">
          <div className="footer-contact-item">
            <div className="footer-qr-card">
              <img src="/wechat-qr.png" alt="微信二维码" />
            </div>
            <div className="footer-contact-label">
              微信：<span className="wx-id">{social.wechat}</span>
              <button className="copy-btn" data-copy={social.wechat} onClick={copyWx}>复制</button>
            </div>
          </div>
          <div className="footer-contact-item">
            <div className="footer-icon-card">
              <span className="footer-icon">&#9993;</span>
              <span className="footer-icon-text">{social.email}</span>
            </div>
            <div className="footer-contact-label">邮箱</div>
          </div>
          <div className="footer-contact-item">
            <a href={social.douyin} target="_blank" rel="noopener noreferrer" className="footer-icon-link">
              <div className="footer-icon-card">
                <span className="footer-icon">&#127925;</span>
                <span className="footer-icon-text">抖音 @Senmoo</span>
              </div>
            </a>
            <div className="footer-contact-label">抖音</div>
          </div>
        </div>
      </div>
      <p className="footer-copyright">&copy; {new Date().getFullYear()} Senmoo. All rights reserved.</p>
    </footer>
  );
}

function copyWx(e) {
  const btn = e.currentTarget;
  const text = btn.getAttribute('data-copy') || '';
  const done = () => {
    const orig = btn.textContent;
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else { done(); }
}
