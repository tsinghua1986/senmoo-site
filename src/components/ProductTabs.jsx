import { useState } from 'react';

const PRODUCTS = [
  {
    id: 'decision-lens',
    icon: '⚖',
    name: '决策透镜',
    nameEn: 'Decision Lens',
    desc: '面对选择不知道怎么分析？决策透镜帮你把模糊的纠结变成清晰的可视化对比。支持单项决策、多方案对比、优先级排序三种模式。',
    status: 'live',
    statusText: '已上线',
    href: '/tools/decision-lens',
    btnText: '打开决策透镜',
  },
  {
    id: 'prompt-reverse',
    icon: '',
    name: '图片反推提示词助手',
    nameEn: 'Prompt Reverse',
    desc: '上传一张图片，AI 自动分析画面内容、风格、构图，反推出高质量的 AI 绘画提示词。支持 Midjourney、Stable Diffusion 等主流模型格式。',
    status: 'dev',
    statusText: '开发中',
    href: null,
    btnText: '敬请期待',
  },
];

export default function ProductTabs() {
  const [active, setActive] = useState(0);
  const product = PRODUCTS[active];

  const handleCardClick = (index, p) => {
    if (p.status !== 'live') return;
    setActive(index);
  };

  return (
    <div className="product-tabs-section">
      {/* 产品卡片作为 Tab */}
      <div className="product-tabs">
        {PRODUCTS.map((p, i) => (
          <div
            key={p.id}
            className={`product-tab-card${i === active ? ' active' : ''}${p.status !== 'live' ? ' disabled' : ''}`}
            onClick={() => handleCardClick(i, p)}
          >
            <div className="product-tab-header">
              <div className="product-tab-icon">{p.icon}</div>
              <div className="product-tab-titles">
                <h3>{p.name}</h3>
                <span className="product-tab-nameen">{p.nameEn}</span>
              </div>
              <span className={`product-status ${p.status}`}>
                {p.status === 'live' ? '●' : '○'} {p.statusText}
              </span>
            </div>
            <p className="product-tab-desc">{p.desc}</p>
            {p.href ? (
              <a href={p.href} className="btn btn-primary product-tab-btn" onClick={(e) => e.stopPropagation()}>
                {p.btnText} <span>→</span>
              </a>
            ) : (
              <button className="btn btn-primary product-tab-btn disabled" disabled>
                {p.btnText}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
