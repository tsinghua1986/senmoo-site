import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useDecision } from '../../store/DecisionContext';

const COLORS = ['#C67C5B', '#B89770', '#D97706', '#DC2626', '#7C3AED'];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function WadmMatrix() {
  const { state, dispatch } = useDecision();
  const wadm = state.modelData.wadm;
  const [activeScorer, setActiveScorer] = useState<{ optionId: string; criterionId: string } | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set());
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [mergeName, setMergeName] = useState('');
  const isMobile = useIsMobile();

  if (!wadm) return null;

  const { options, criteria, scores } = wadm;

  // Calculate totals
  const totals = options.map(opt => {
    let total = 0;
    for (const crit of criteria) {
      const score = scores[opt.id]?.[crit.id] ?? 5;
      total += score * crit.weight;
    }
    return { optionId: opt.id, total };
  });

  const maxTotal = Math.max(...totals.map(t => t.total));
  const winnerId = totals.find(t => t.total === maxTotal)?.optionId;

  // Radar chart data
  const radarData = criteria.map(crit => {
    const point: Record<string, string | number> = { criterion: crit.name };
    for (const opt of options) {
      point[opt.name] = scores[opt.id]?.[crit.id] ?? 5;
    }
    return point;
  });

  const toggleMergeSelection = (critId: string, critName: string) => {
    setMergeSelection(prev => {
      const next = new Set(prev);
      if (next.has(critId)) next.delete(critId);
      else next.add(critId);
      return next;
    });
    if (!mergeTarget) setMergeTarget(critId);
    setMergeName(prev => prev || critName);
  };

  const executeMerge = () => {
    if (mergeSelection.size !== 2 || !mergeTarget || !mergeName.trim()) return;
    const ids = Array.from(mergeSelection);
    const removeId = ids.find(id => id !== mergeTarget)!;
    dispatch({
      type: 'MERGE_WADM_CRITERIA',
      payload: { keepId: mergeTarget, removeId, mergedName: mergeName.trim() },
    });
    setMergeMode(false);
    setMergeSelection(new Set());
    setMergeTarget(null);
    setMergeName('');
  };

  const updateScore = (optionId: string, criterionId: string, score: number) => {
    dispatch({ type: 'UPDATE_WADM_SCORE', payload: { optionId, criterionId, score } });
    setActiveScorer(null);
  };

  const updateWeight = (criterionId: string, weight: number) => {
    dispatch({ type: 'UPDATE_WADM_WEIGHT', payload: { criterionId, weight } });
  };

  // Get active scorer info for bottom sheet
  const activeOption = activeScorer ? options.find(o => o.id === activeScorer.optionId) : null;
  const activeCriterion = activeScorer ? criteria.find(c => c.id === activeScorer.criterionId) : null;
  const activeScore = activeScorer ? (scores[activeScorer.optionId]?.[activeScorer.criterionId] ?? 5) : 5;

  return (
    <div className="space-y-6">
      {/* Merge Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setMergeMode(!mergeMode);
            setMergeSelection(new Set());
            setMergeTarget(null);
            setMergeName('');
          }}
          className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
            mergeMode ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {mergeMode ? '取消合并' : '合并维度'}
        </button>
        {mergeMode && (
          <span className="text-xs text-gray-500">
            选择两个维度进行合并 · 已选 {mergeSelection.size}/2
          </span>
        )}
      </div>
      {mergeMode && mergeSelection.size === 2 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
          <input
            value={mergeName}
            onChange={e => setMergeName(e.target.value)}
            placeholder="合并后的维度名称"
            className="flex-1 text-sm border border-purple-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-purple-400 bg-white"
          />
          <button
            onClick={executeMerge}
            disabled={!mergeName.trim()}
            className="px-4 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
          >确认合并</button>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {mergeMode && <th className="p-2 w-10"></th>}
              <th className="text-left p-2 text-gray-500 font-medium min-w-[120px]">维度 (权重)</th>
              {options.map((opt, i) => (
                <th key={opt.id} className="p-2 text-center font-semibold min-w-[100px]" style={{ color: COLORS[i % COLORS.length] }}>
                  {opt.name}
                  {opt.id === winnerId && <span className="ml-1">&#128081;</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map(crit => {
              const weightPercent = ((crit.weight - 1) / 4) * 100;
              return (
                <tr key={crit.id} className="border-t border-gray-100">
                  {mergeMode && (
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={mergeSelection.has(crit.id)}
                        onChange={() => toggleMergeSelection(crit.id, crit.name)}
                        className="w-4 h-4 accent-purple-600"
                      />
                    </td>
                  )}
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 flex-1">{crit.name}</span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={crit.weight}
                        onChange={e => updateWeight(crit.id, parseInt(e.target.value))}
                        style={{ '--value-percent': `${weightPercent}%` } as React.CSSProperties}
                        className="w-16"
                      />
                      <span className="text-xs text-gray-400 w-4">{crit.weight}</span>
                    </div>
                  </td>
                  {options.map(opt => {
                    const score = scores[opt.id]?.[crit.id] ?? 5;
                    const isActive = activeScorer?.optionId === opt.id && activeScorer?.criterionId === crit.id;
                    return (
                      <td key={opt.id} className="p-2 text-center relative">
                        <button
                          onClick={() => setActiveScorer(isActive ? null : { optionId: opt.id, criterionId: crit.id })}
                          className={`
                            w-10 h-10 rounded-lg text-sm font-semibold transition-all
                            ${score >= 8 ? 'bg-orange-100 text-orange-700' : score >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}
                            ${isActive ? 'ring-2 ring-orange-400 scale-110' : 'hover:scale-105'}
                          `}
                        >
                          {score}
                        </button>

                        {/* PC Popover */}
                        {!isMobile && isActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute z-20 top-12 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-48"
                          >
                            <p className="text-xs text-gray-500 mb-2">拖动打分 (1-10)</p>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              step={1}
                              value={score}
                              onChange={e => updateScore(opt.id, crit.id, parseInt(e.target.value))}
                              style={{ '--value-percent': `${(score - 1) / 9 * 100}%` } as React.CSSProperties}
                              className="w-full"
                            />
                            <div className="text-center text-lg font-bold text-[#C67C5B] mt-1">{score}</div>
                          </motion.div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-gray-200 font-semibold">
              <td className="p-2 text-gray-700">加权总分</td>
              {totals.map(t => (
                <td key={t.optionId} className="p-2 text-center">
                  <span className={`text-lg ${t.optionId === winnerId ? 'text-[#C67C5B]' : 'text-gray-500'}`}>
                    {t.total.toFixed(1)}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Radar Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 12, fill: '#6B7280' }} />
            {options.map((opt, i) => (
              <Radar
                key={opt.id}
                name={opt.name}
                dataKey={opt.name}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {isMobile && activeScorer && activeOption && activeCriterion && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setActiveScorer(null)}
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-6 pb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400">打分</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {activeOption.name} · {activeCriterion.name}
                  </p>
                </div>
                <button
                  onClick={() => setActiveScorer(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={activeScore}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  dispatch({ type: 'UPDATE_WADM_SCORE', payload: { optionId: activeScorer.optionId, criterionId: activeScorer.criterionId, score: val } });
                }}
                style={{ '--value-percent': `${(activeScore - 1) / 9 * 100}%` } as React.CSSProperties}
                className="w-full"
              />
              <div className="text-center text-3xl font-bold text-[#C67C5B] mt-3">{activeScore}</div>
              <button
                onClick={() => setActiveScorer(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#C67C5B] text-white text-sm font-medium"
              >
                确认
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
