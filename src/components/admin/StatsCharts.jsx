import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function StatsCharts() {
  const [range, setRange] = useState(7);
  const [dauData, setDauData] = useState([]);
  const [typeData, setTypeData] = useState(/** @type {Record<string, number>} */ ({}));
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [range]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range);
      const startStr = startDate.toISOString();

      // 获取使用记录
      const { data: logs } = await supabase
        .from('usage_logs')
        .select('user_id, decision_type, created_at')
        .gte('created_at', startStr)
        .order('created_at', { ascending: true });

      if (!logs) {
        setLoading(false);
        return;
      }

      // DAU 数据
      const dauMap = {};
      for (let i = 0; i < range; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (range - 1 - i));
        const key = d.toISOString().split('T')[0];
        dauMap[key] = new Set();
      }
      logs.forEach(log => {
        const day = log.created_at.split('T')[0];
        if (dauMap[day]) dauMap[day].add(log.user_id);
      });
      setDauData(Object.entries(dauMap).map(([date, users]) => ({ date, count: users.size })));

      // 决策类型分布
      const typeMap = {};
      logs.forEach(log => {
        typeMap[log.decision_type] = (typeMap[log.decision_type] || 0) + 1;
      });
      setTypeData(typeMap);

      // 每日API调用量
      const apiMap = {};
      for (let i = 0; i < range; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (range - 1 - i));
        const key = d.toISOString().split('T')[0];
        apiMap[key] = 0;
      }
      logs.forEach(log => {
        const day = log.created_at.split('T')[0];
        if (apiMap[day] !== undefined) apiMap[day]++;
      });
      setApiData(Object.entries(apiMap).map(([date, count]) => ({ date, count })));
    } catch (err) {
      console.error('Stats load error:', err);
    }
    setLoading(false);
  };

  const maxDau = Math.max(...dauData.map(d => d.count), 1);
  const maxApi = Math.max(...apiData.map(d => d.count), 1);
  const totalTypes = Object.values(typeData).reduce((a, b) => a + b, 0) || 1;
  const typeLabels = { single: '利弊分析', multi: '加权决策', priority: '四象限', unknown: '其他' };
  const typeColors = ['#C67C5B', '#D4A574', '#B89770', '#9a9aaa'];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>数据统计</h1>
        <p>使用数据分析</p>
      </div>

      <div className="admin-toolbar">
        <div className="admin-range-btns">
          <button className={range === 7 ? 'active' : ''} onClick={() => setRange(7)}>最近7天</button>
          <button className={range === 30 ? 'active' : ''} onClick={() => setRange(30)}>最近30天</button>
        </div>
      </div>

      {loading ? (
        <div className="admin-page-loading">加载中...</div>
      ) : (
        <>
          {/* DAU 折线图 */}
          <div className="admin-chart-card">
            <h3>每日活跃用户数（DAU）</h3>
            <div className="admin-bar-chart">
              {dauData.map((d) => (
                <div key={d.date} className="admin-bar-item">
                  <div className="admin-bar" style={{ height: `${(d.count / maxDau) * 100}%` }}>
                    <span className="admin-bar-value">{d.count}</span>
                  </div>
                  <span className="admin-bar-label">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-charts-row">
            {/* 决策类型分布 */}
            <div className="admin-chart-card">
              <h3>决策类型分布</h3>
              <div className="admin-pie-legend">
                {Object.entries(typeData).map(([type, count], i) => (
                  <div key={type} className="admin-pie-item">
                    <span className="admin-pie-dot" style={{ background: typeColors[i % typeColors.length] }} />
                    <span>{typeLabels[type] || type}</span>
                    <span className="admin-pie-pct">{Math.round((count / totalTypes) * 100)}%</span>
                  </div>
                ))}
                {Object.keys(typeData).length === 0 && <p className="admin-table-empty">暂无数据</p>}
              </div>
            </div>

            {/* 每日API调用量 */}
            <div className="admin-chart-card">
              <h3>每日 API 调用量</h3>
              <div className="admin-bar-chart">
                {apiData.map((d) => (
                  <div key={d.date} className="admin-bar-item">
                    <div className="admin-bar bar-secondary" style={{ height: `${(d.count / maxApi) * 100}%` }}>
                      <span className="admin-bar-value">{d.count}</span>
                    </div>
                    <span className="admin-bar-label">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
