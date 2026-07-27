import { useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useDecision } from '../../store/DecisionContext';
import { trackEvent } from '../../services/analytics';

export default function FlowB_Options() {
  const { state, dispatch } = useDecision();

  const [options, setOptions] = useState<string[]>(
    state.options ?? []
  );
  const [criteria, setCriteria] = useState<string[]>(
    state.criteria ?? []
  );
  const [newOption, setNewOption] = useState('');
  const [newCriterion, setNewCriterion] = useState('');

  const hardConstraints = state.constraints?.hard ?? [];
  const softConstraints = state.constraints?.soft ?? [];

  const addOption = () => {
    if (newOption.trim()) {
      setOptions(prev => [...prev, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, text: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? text : o));
  };

  const addCriterion = () => {
    if (newCriterion.trim()) {
      setCriteria(prev => [...prev, newCriterion.trim()]);
      setNewCriterion('');
    }
  };

  const removeCriterion = (idx: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, text: string) => {
    setCriteria(prev => prev.map((c, i) => i === idx ? text : c));
  };

  const handleConfirm = () => {
    if (options.length < 2 || criteria.length < 1) return;

    const optIds = options.map(() => uuidv4());
    const critIds = criteria.map(() => uuidv4());

    const wadmOptions = options.map((name, i) => ({ id: optIds[i], name }));
    const wadmCriteria = criteria.map((name, i) => ({ id: critIds[i], name, weight: 3 }));

    // Initialize scores
    const scores: Record<string, Record<string, number>> = {};
    for (const optId of optIds) {
      scores[optId] = {};
      for (const critId of critIds) {
        scores[optId][critId] = 5;
      }
    }

    dispatch({
      type: 'SET_WADM_DATA',
      payload: { options: wadmOptions, criteria: wadmCriteria, scores },
    });

    dispatch({
      type: 'SET_FLOW_STEP',
      payload: 1,
    });

    dispatch({ type: 'SET_STAGE', payload: 3 });

    trackEvent('stage_completed', { stage: 2, flow: 'multi', step: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-4 py-6 space-y-6"
    >
      {/* Soul Reframe Card */}
      {state.realIssue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#0F766E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0F766E] mb-1">核心问题重构</h3>
              <p className="text-gray-800 text-base leading-relaxed">{state.realIssue}</p>
            </div>
          </div>
          {state.hiddenAssumptions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-amber-600 mb-2">隐性假设</h4>
              <div className="space-y-2">
                {state.hiddenAssumptions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-amber-400 mt-0.5">&#9670;</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Constraints Reminder */}
      {(hardConstraints.length > 0 || softConstraints.length > 0) && (
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">约束条件回顾</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hardConstraints.length > 0 && (
              <div className="bg-red-50/60 rounded-xl p-3 border border-red-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">🔒</span>
                  <h4 className="text-xs font-semibold text-red-700">硬约束 (不可违背)</h4>
                </div>
                <ul className="space-y-1">
                  {hardConstraints.map((c, i) => (
                    <li key={i} className="text-xs text-red-800/80 flex items-start gap-1.5">
                      <span className="text-red-300 mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {softConstraints.length > 0 && (
              <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs">🔓</span>
                  <h4 className="text-xs font-semibold text-amber-700">软约束 (可以挑战)</h4>
                </div>
                <ul className="space-y-1">
                  {softConstraints.map((c, i) => (
                    <li key={i} className="text-xs text-amber-800/80 flex items-start gap-1.5">
                      <span className="text-amber-300 mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            提示：评估维度应优先反映软约束；硬约束作为选项的准入门槛，不满足硬约束的选项应在后续步骤中被剔除。
          </p>
        </div>
      )}

      {/* Options & Criteria Editor */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 text-center mb-1">选项与评估维度</h3>
        <p className="text-sm text-gray-500 text-center mb-6">确认 AI 提取的选项和评估维度，或自行添加</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Options */}
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-[#1E3A8A] mb-3">备选方案</h4>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm">
                  <input
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    className="flex-1 text-sm border-none outline-none bg-transparent text-gray-700"
                  />
                  <button onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-400 text-xs">&times;</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addOption(); }}
                placeholder="添加选项..."
                className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              />
              <button
                onClick={addOption}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                disabled={!newOption.trim()}
              >+</button>
            </div>
          </div>

          {/* Criteria */}
          <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100">
            <h4 className="text-sm font-semibold text-purple-700 mb-3">评估维度</h4>
            <div className="space-y-2">
              {criteria.map((crit, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm">
                  <input
                    value={crit}
                    onChange={e => updateCriterion(i, e.target.value)}
                    className="flex-1 text-sm border-none outline-none bg-transparent text-gray-700"
                  />
                  <button onClick={() => removeCriterion(i)} className="text-gray-300 hover:text-red-400 text-xs">&times;</button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newCriterion}
                onChange={e => setNewCriterion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCriterion(); }}
                placeholder="添加维度..."
                className="flex-1 text-sm border border-purple-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-purple-400 bg-white"
              />
              <button
                onClick={addCriterion}
                className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
                disabled={!newCriterion.trim()}
              >+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleConfirm}
          disabled={options.length < 2 || criteria.length < 1}
          className="px-8 py-3 rounded-2xl bg-[#0F766E] text-white font-semibold hover:bg-[#0D6B63] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/20"
        >
          确认选项，进入打分排名
        </button>
      </div>
    </motion.div>
  );
}
