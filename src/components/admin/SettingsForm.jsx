import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function SettingsForm() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.from('app_config').select('key, value');
      if (!error && data) {
        const map = {};
        (data || []).forEach(item => { map[item.key] = item.value; });
        setConfig(map);
      }
    } catch (err) {
      console.error('Load config error:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updates = Object.entries(config).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('app_config').upsert(updates);
      if (error) {
        setMessage('保存失败: ' + error.message);
      } else {
        setMessage('保存成功');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (err) {
      setMessage('保存失败');
    }
    setSaving(false);
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="admin-page-loading">加载中...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>系统配置</h1>
        <p>管理系统参数</p>
      </div>

      {message && (
        <div className={`admin-message ${message.includes('成功') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* 使用限制 */}
      <div className="admin-settings-section">
        <h3>使用限制</h3>
        <div className="admin-settings-card">
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <label>每日使用次数限制</label>
              <span className="admin-setting-desc">每个用户每天可使用的次数</span>
            </div>
            <div className="admin-setting-input">
              <input
                type="number"
                min="1"
                max="100"
                value={config.daily_limit || '10'}
                onChange={(e) => updateConfig('daily_limit', e.target.value)}
              />
              <span className="admin-setting-unit">次/用户/天</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI 配置 */}
      <div className="admin-settings-section">
        <h3>AI 配置</h3>
        <div className="admin-settings-card">
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <label>默认模型</label>
              <span className="admin-setting-desc">决策透镜使用的 AI 模型</span>
            </div>
            <select
              value={config.ai_model || 'deepseek-chat'}
              onChange={(e) => updateConfig('ai_model', e.target.value)}
            >
              <option value="deepseek-chat">deepseek-chat</option>
              <option value="deepseek-reasoner">deepseek-reasoner</option>
            </select>
          </div>
        </div>
      </div>

      {/* 站点配置 */}
      <div className="admin-settings-section">
        <h3>站点配置</h3>
        <div className="admin-settings-card">
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <label>站点名称</label>
              <span className="admin-setting-desc">显示在页面标题中的名称</span>
            </div>
            <input
              type="text"
              value={config.site_name || 'Senmoo'}
              onChange={(e) => updateConfig('site_name', e.target.value)}
            />
          </div>
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <label>是否开放注册</label>
              <span className="admin-setting-desc">关闭后新用户无法注册</span>
            </div>
            <select
              value={config.open_registration || 'true'}
              onChange={(e) => updateConfig('open_registration', e.target.value)}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <label>显示“关于我”</label>
              <span className="admin-setting-desc">开启后前端导航栏显示“关于我”入口</span>
            </div>
            <select
              value={config.show_about || 'false'}
              onChange={(e) => updateConfig('show_about', e.target.value)}
            >
              <option value="true">显示</option>
              <option value="false">隐藏</option>
            </select>
          </div>
        </div>
      </div>

      <button
        className="admin-btn-primary"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '保存中...' : '保存配置'}
      </button>
    </div>
  );
}
