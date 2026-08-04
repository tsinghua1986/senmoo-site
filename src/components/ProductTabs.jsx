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

  return (
    <div className="product-tabs-section">
      {/* 横向产品卡片列表 */}
      <div className="product-tabs">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            className={`product-tab${i === active ? ' active' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="product-tab-icon">{p.icon}</span>
            <span className="product-tab-name">{p.name}</span>
            {p.status === 'dev' && (
              <span className="product-tab-badge">开发中</span>
            )}
          </button>
        ))}
      </div>

      {/* 产品详情 */}
      <div className="product-detail">
        <div className="product-detail-header">
          <h3 className="product-detail-title">
            {product.name} <span className="product-detail-nameen">{product.nameEn}</span>
          </h3>
          <span className={`product-status ${product.status}`}>
            {product.status === 'live' ? '●' : '○'} {product.statusText}
          </span>
        </div>
        <p className="product-detail-desc">{product.desc}</p>
        {product.href ? (
          <a href={product.href} className="btn btn-primary product-detail-btn">
            {product.btnText} <span>→</span>
          </a>
        ) : (
          <button className="btn btn-primary product-detail-btn disabled" disabled>
            {product.btnText}
          </button>
        )}
      </div>
    </div>
  );
}
