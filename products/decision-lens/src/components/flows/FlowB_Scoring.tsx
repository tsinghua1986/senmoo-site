import { motion } from 'framer-motion';
import { useDecision } from '../../store/DecisionContext';
import { trackEvent } from '../../services/analytics';
import WadmMatrix from '../models/WadmMatrix';

export default function FlowB_Scoring() {
  const { state, dispatch } = useDecision();

  const softConstraints = state.constraints?.soft ?? [];

  const handleProceed = () => {
    trackEvent('stage_completed', { stage: 3, flow: 'multi', duration_seconds: Math.round((Date.now() - state.createdAt) / 1000) });
    dispatch({ type: 'SET_STAGE', payload: 4 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto px-4 py-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1E3A8A]">加权决策矩阵</h2>
        <p className="text-sm text-gray-500 mt-1">
          为每个选项在每个维度上打分（1-10），并调整维度权重
        </p>
      </div>

      {/* Simplify Guidance */}
      {softConstraints.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">💡</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">简化提示</h4>
              <p className="text-xs text-amber-700 mb-2">
                权重较低或高度相关的维度可以合并；不满足硬约束的选项应直接剔除。
              </p>
              <ul className="space-y-0.5">
                {softConstraints.map((c, i) => (
                  <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <WadmMatrix />
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={handleProceed}
          className="px-8 py-3 rounded-2xl bg-[#0F766E] text-white font-semibold hover:bg-[#0D6B63] transition-colors shadow-lg shadow-teal-600/20"
        >
          生成破冰行动
        </button>
      </div>
    </motion.div>
  );
}
