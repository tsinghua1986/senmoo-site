import { useState } from 'react';

export default function AdminPanel({ currentConfig }) {
  const config = JSON.parse(currentConfig);
  const [modules, setModules] = useState({ ...config.modules });
  const [social, setSocial] = useState({ ...config.social });
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const toggleModule = (key) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSocial = (key, value) => {
    setSocial((prev) => ({ ...prev, [key]: value }));
  };

  const generateConfig = () => {
    const lines = [
      '// ============================================================',
      '// Senmoo 站点配置',
      '// 控制各模块的显隐和功能开关',
      '// 修改后重新构建即可生效',
      '// ============================================================',
      '',
      'export const SITE_CONFIG = {',
      '  // --- 模块显隐 ---',
      '  modules: {',
    ];

    const moduleEntries = Object.entries(modules);
    moduleEntries.forEach(([key, value], i) => {
      const comma = i < moduleEntries.length - 1 ? ',' : ',';
      const label = getModuleLabel(key);
      lines.push(`    ${key}: ${value},${'  '.repeat(Math.max(0, 3 - key.length))}// ${label}`);
    });

    lines.push('  },');
    lines.push('');
    lines.push('  // --- 社交链接 ---');
    lines.push('  social: {');

    const socialEntries = Object.entries(social);
    socialEntries.forEach(([key, value], i) => {
      const comma = i < socialEntries.length - 1 ? ',' : ',';
      lines.push(`    ${key}: '${value}',`);
    });

    lines.push('  },');
    lines.push('');
    lines.push('  // --- 站点元数据 ---');
    lines.push('  meta: {');
    lines.push(`    title: '${config.meta.title}',`);
    lines.push(`    tagline: '${config.meta.tagline}',`);
    lines.push(`    description: '${config.meta.description}',`);
    lines.push(`    url: '${config.meta.url}',`);
    lines.push('  },');
    lines.push('} as const;');
    lines.push('');

    return lines.join('\n');
  };

  const getModuleLabel = (key) => {
    const labels = {
      blog: '博客模块（暂未开放）',
      decisionLens: '决策透镜入口',
    };
    return labels[key] || key;
  };

  const getModuleDescription = (key) => {
    const descriptions = {
      blog: '开启后导航栏和首页将显示博客入口',
      decisionLens: '关闭后首页将隐藏 AI 产品卡片和最新动态',
    };
    return descriptions[key] || '';
  };

  const handleCopy = async () => {
    const text = generateConfig();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const configOutput = showOutput ? generateConfig() : '';

  return (
    <div className="space-y-8">
      {/* Module Toggles */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6">模块开关</h2>
        <div className="space-y-5">
          {Object.entries(modules).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]"
            >
              <div>
                <div className="font-medium text-sm">{getModuleLabel(key)}</div>
                <div className="text-xs text-[#6b7280] mt-1">{getModuleDescription(key)}</div>
              </div>
              <button
                onClick={() => toggleModule(key)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  value ? 'bg-[#7C3AED]' : 'bg-white/[0.1]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                    value ? 'left-[26px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 md:p-8">
        <h2 className="text-lg font-semibold mb-6">社交链接</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2">微信号</label>
            <input
              type="text"
              value={social.wechat}
              onChange={(e) => updateSocial('wechat', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2">邮箱</label>
            <input
              type="email"
              value={social.email}
              onChange={(e) => updateSocial('email', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[#9ca3af] mb-2">抖音链接</label>
            <input
              type="url"
              value={social.douyin}
              onChange={(e) => updateSocial('douyin', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setShowOutput(!showOutput)}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-90 transition-opacity"
        >
          {showOutput ? '隐藏配置' : '生成配置'}
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-[#9ca3af] border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
        >
          {copied ? '已复制!' : '复制配置代码'}
        </button>
      </div>

      {/* Output */}
      {showOutput && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#9ca3af]">src/config.ts</h3>
            <span className="text-xs text-[#6b7280]">
              复制后替换项目中的 src/config.ts 文件，重新部署即可
            </span>
          </div>
          <pre className="p-4 rounded-xl bg-[#0a0a0f] border border-white/[0.06] overflow-x-auto text-xs text-[#9ca3af] leading-relaxed whitespace-pre-wrap">
            {configOutput}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl bg-[#7C3AED]/[0.05] border border-[#7C3AED]/[0.15] p-6">
        <h3 className="text-sm font-semibold text-[#7C3AED] mb-3">使用说明</h3>
        <div className="text-xs text-[#9ca3af] space-y-2 leading-relaxed">
          <p>1. 在上方调整模块开关和社交链接</p>
          <p>2. 点击「生成配置」预览，再点击「复制配置代码」</p>
          <p>3. 打开项目中的 <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#EC4899]">src/config.ts</code> 文件，用复制的内容替换</p>
          <p>4. 重新构建并部署：<code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#EC4899]">npm run build</code></p>
        </div>
      </div>
    </div>
  );
}
