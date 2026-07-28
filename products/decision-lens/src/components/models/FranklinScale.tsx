import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDecision } from '../../store/DecisionContext';
import { trackEvent } from '../../services/analytics';
import type { FranklinItem } from '../../types';

/* ===== Scale Markers (1-10) shown below each slider ===== */
function ScaleMarkers() {
  return (
    <div className="flex justify-between px-0.5 mt-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i + 1} className="text-[9px] text-gray-300 w-3 text-center">
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/* ===== Editable Slider Row ===== */
function SliderRow({
  item,
  onChange,
  onAbolish,
  onEditText,
  cancelled,
}: {
  item: FranklinItem;
  onChange: (id: string, val: number) => void;
  onAbolish?: (id: string) => void;
  onEditText?: (id: string, text: string) => void;
  cancelled: boolean;
}) {
  const percent = ((item.weight - 1) / 9) * 100;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const startEdit = () => {
    if (cancelled) return;
    setEditText(item.text);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text && onEditText) {
      onEditText(item.id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className={`py-2.5 group ${cancelled ? 'pointer-events-none' : ''}`}>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: cancelled ? 0.3 : 1 }}
        transition={{ duration: 0.6 }}
        className="space-y-1.5"
      >
        {/* Text line — full width, wraps freely */}
        <div className="pr-16 relative">
          {editing ? (
            <input
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="w-full text-sm border border-orange-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-orange-400"
            />
          ) : (
            <span
              onDoubleClick={startEdit}
              title="双击编辑文字"
              className={`text-sm leading-relaxed cursor-text select-none break-words ${
                cancelled ? 'line-through text-gray-400' : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {item.isHard && <span className="text-red-400 mr-1">&#128274;</span>}
              {item.text}
            </span>
          )}
          {/* Abolish button — absolutely positioned to the right */}
          {onAbolish && (
            <button
              onClick={() => onAbolish(item.id)}
              className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity px-1"
              title={item.isHard ? '废除硬约束' : '废除此条目'}
            >
              废除
            </button>
          )}
        </div>

        {/* Slider row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={item.weight}
              onChange={e => {
                onChange(item.id, parseFloat(e.target.value));
                trackEvent('slider_adjusted', {
                  model_type: 'franklin',
                  field: 'weight',
                  item_id: item.id,
                  old_value: item.weight,
                  new_value: parseFloat(e.target.value),
                });
              }}
              style={{ '--value-percent': `${percent}%` } as React.CSSProperties}
              className="w-full"
              disabled={cancelled}
            />
            <ScaleMarkers />
          </div>
          <span className="w-8 text-right text-sm font-mono text-gray-500 shrink-0">
            {item.weight.toFixed(1)}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ===== Main Component ===== */
export default function FranklinScale() {
  const { state, dispatch } = useDecision();
  const franklin = state.modelData.franklin;
  const [cancelResult, setCancelResult] = useState<string | null>(null);
  const [cancelledProIds, setCancelledProIds] = useState<Set<string>>(new Set());
  const [cancelledConIds, setCancelledConIds] = useState<Set<string>>(new Set());
  const [newProText, setNewProText] = useState('');
  const [newConText, setNewConText] = useState('');
  const [hideCancelled, setHideCancelled] = useState(false);

  /* --- Callbacks (must be before early return) --- */
  const handleCancelOut = useCallback(() => {
    if (!franklin) return;
    const matchedPros: string[] = [];
    const matchedCons: string[] = [];
    const messages: string[] = [];
    const usedCons = new Set<string>();

    const sortedPros = [...franklin.pros].filter(p => !cancelledProIds.has(p.id)).sort((a, b) => b.weight - a.weight);
    const sortedCons = [...franklin.cons].filter(c => !cancelledConIds.has(c.id)).sort((a, b) => b.weight - a.weight);

    for (const pro of sortedPros) {
      for (const con of sortedCons) {
        if (usedCons.has(con.id)) continue;
        if (Math.abs(pro.weight - con.weight) <= 1.0) {
          matchedPros.push(pro.id);
          matchedCons.push(con.id);
          usedCons.add(con.id);
          messages.push(`「${pro.text}」与「${con.text}」权重相近，已抵消`);
          break;
        }
      }
    }

    if (matchedPros.length === 0) {
      setCancelResult('未找到权重相近的可抵消对，以下为影响你决策的核心变量。');
    } else {
      dispatch({ type: 'CANCEL_OUT_FRANKLIN', payload: { proIds: matchedPros, conIds: matchedCons } });
      setCancelledProIds(prev => new Set([...prev, ...matchedPros]));
      setCancelledConIds(prev => new Set([...prev, ...matchedCons]));
      setCancelResult(messages.join('\n'));
    }
  }, [franklin, cancelledProIds, cancelledConIds, dispatch]);

  if (!franklin) return null;

  // Sort: hard constraints first in cons
  const sortedCons = [...franklin.cons].sort((a, b) => {
    if (a.isHard && !b.isHard) return -1;
    if (!a.isHard && b.isHard) return 1;
    return 0;
  });

  const updateWeight = (side: 'pros' | 'cons', id: string, weight: number) => {
    dispatch({ type: 'UPDATE_FRANKLIN_ITEM', payload: { side, id, weight } });
  };

  const abolishItem = (side: 'pros' | 'cons', id: string) => {
    dispatch({ type: 'ABOLISH_FRANKLIN_ITEM', payload: { side, id } });
  };

  const editText = (side: 'pros' | 'cons', id: string, text: string) => {
    dispatch({ type: 'UPDATE_FRANKLIN_TEXT', payload: { side, id, text } });
  };

  const addItem = (side: 'pros' | 'cons', text: string) => {
    const defaultWeight = side === 'pros' ? 6 : 4;
    dispatch({ type: 'ADD_FRANKLIN_ITEM', payload: { side, text, weight: defaultWeight } });
  };

  const activePros = franklin.pros.filter(p => !cancelledProIds.has(p.id));
  const activeCons = franklin.cons.filter(c => !cancelledConIds.has(c.id));
  const totalPros = activePros.reduce((s, i) => s + i.weight, 0);
  const totalCons = activeCons.reduce((s, i) => s + i.weight, 0);
  const diff = totalPros - totalCons;
  const tilt = Math.max(-30, Math.min(30, diff * 3));

  return (
    <div className="space-y-6">
      {/* Franklin Scale Explanation */}
      <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 text-center">
        <h4 className="text-sm font-semibold text-blue-800 mb-1.5">富兰克林天平法则</h4>
        <p className="text-xs text-blue-700/80 leading-relaxed">
          本杰明·富兰克林在做重大决策时，会在纸的两侧分别列出赞成与反对的理由，并为每条赋予权重。
          权重相近的赞成与反对项可以相互抵消，最终天平倾斜的方向就是你的理性选择。
        </p>
      </div>

      {/* Balance SVG */}
      <div className="flex justify-center">
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Base */}
          <polygon points="100,110 85,120 115,120" fill="#C67C5B" />
          <line x1="100" y1="30" x2="100" y2="110" stroke="#C67C5B" strokeWidth="3" />
          {/* Beam */}
          <motion.line
            x1="20" y1="30" x2="180" y2="30"
            stroke="#B89770" strokeWidth="3" strokeLinecap="round"
            animate={{
              x1: 20 + Math.sin(tilt * Math.PI / 180) * 80 * (tilt > 0 ? -0.3 : 0.3),
              y1: 30 + Math.sin(Math.abs(tilt) * Math.PI / 180) * (tilt > 0 ? 15 : -15),
              x2: 180 + Math.sin(tilt * Math.PI / 180) * 80 * (tilt > 0 ? 0.3 : -0.3),
              y2: 30 + Math.sin(Math.abs(tilt) * Math.PI / 180) * (tilt > 0 ? -15 : 15),
            }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
          {/* Labels */}
          <text x="30" y="20" fontSize="11" fill="#C67C5B" fontWeight="600">赞成</text>
          <text x="150" y="20" fontSize="11" fill="#DC2626" fontWeight="600">反对</text>
        </svg>
      </div>

      {/* Score Summary */}
      <div className="flex justify-center gap-8 text-sm">
        <span className="text-orange-600 font-semibold">赞成总分: {totalPros.toFixed(1)}</span>
        <span className="text-red-500 font-semibold">反对总分: {totalCons.toFixed(1)}</span>
      </div>
      <p className="text-center text-xs text-gray-400">拖动滑块调整重要程度（1=不重要，10=关键因素）· 双击文字可编辑</p>
      {cancelledProIds.size > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setHideCancelled(!hideCancelled)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {hideCancelled ? `显示已抵消项 (${cancelledProIds.size + cancelledConIds.size})` : '隐藏已抵消项'}
          </button>
        </div>
      )}

      {/* Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pros */}
        <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100">
          <h4 className="text-sm font-semibold text-[#C67C5B] mb-3">赞成去做 (Pros)</h4>
          <div className="space-y-1">
            {franklin.pros.filter(p => !hideCancelled || !cancelledProIds.has(p.id)).map(item => (
              <SliderRow
                key={item.id}
                item={item}
                onChange={(id, w) => updateWeight('pros', id, w)}
                onAbolish={(id) => abolishItem('pros', id)}
                onEditText={(id, text) => editText('pros', id, text)}
                cancelled={cancelledProIds.has(item.id)}
              />
            ))}
          </div>
          {/* Add Pro */}
          <div className="mt-3 flex gap-2">
            <input
              value={newProText}
              onChange={e => setNewProText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newProText.trim()) {
                  addItem('pros', newProText.trim());
                  setNewProText('');
                }
              }}
              placeholder="添加一条赞成的理由…"
              className="flex-1 text-sm border border-orange-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-orange-400 bg-white"
            />
            <button
              onClick={() => {
                if (newProText.trim()) {
                  addItem('pros', newProText.trim());
                  setNewProText('');
                }
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-40"
              disabled={!newProText.trim()}
            >
              +
            </button>
          </div>
        </div>

        {/* Cons - hard constraints first */}
        <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
          <h4 className="text-sm font-semibold text-red-600 mb-3">反对/维持原状 (Cons)</h4>
          <div className="space-y-1">
            {sortedCons.filter(c => !hideCancelled || !cancelledConIds.has(c.id)).map(item => (
              <SliderRow
                key={item.id}
                item={item}
                onChange={(id, w) => updateWeight('cons', id, w)}
                onAbolish={(id) => abolishItem('cons', id)}
                onEditText={(id, text) => editText('cons', id, text)}
                cancelled={cancelledConIds.has(item.id)}
              />
            ))}
          </div>
          {/* Add Con */}
          <div className="mt-3 flex gap-2">
            <input
              value={newConText}
              onChange={e => setNewConText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newConText.trim()) {
                  addItem('cons', newConText.trim());
                  setNewConText('');
                }
              }}
              placeholder="添加一条反对的理由…"
              className="flex-1 text-sm border border-red-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-red-400 bg-white"
            />
            <button
              onClick={() => {
                if (newConText.trim()) {
                  addItem('cons', newConText.trim());
                  setNewConText('');
                }
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40"
              disabled={!newConText.trim()}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Out */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100 max-w-lg text-center">
          <h4 className="text-xs font-semibold text-amber-800 mb-1">两两相消规则</h4>
          <p className="text-xs text-amber-700/80 leading-relaxed">
            系统会将权重差值 ≤ 1.0 的赞成项与反对项配对抵消，模拟富兰克林"划掉相近理由"的思考过程。
            抵消后天平仅保留无法配对的核心博弈项，帮助你更清晰地看到决策的关键矛盾。
          </p>
        </div>
        <button
          onClick={handleCancelOut}
          className="px-6 py-2.5 rounded-xl border-2 border-dashed border-orange-400 text-[#C67C5B] text-sm font-medium hover:bg-orange-50 transition-colors animate-pulse"
        >
          两两相消
        </button>
        <AnimatePresence>
          {cancelResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 max-w-lg text-center whitespace-pre-line"
            >
              {cancelResult}
              {cancelledProIds.size > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  已抵消 {cancelledProIds.size} 对，天平仅保留核心博弈项
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
