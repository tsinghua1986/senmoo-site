import { motion } from 'framer-motion';
import { useDecision } from '../../store/DecisionContext';
import { trackEvent } from '../../services/analytics';
import EisenhowerMatrix from '../models/EisenhowerMatrix';

export default function FlowC_Quadrant() {
  const { state, dispatch } = useDecision();

  const softConstraints = state.constraints?.soft ?? [];

  const handleProceed = () => {
    trackEvent('stage_completed', { stage: 3, flow: 'priority', duration_seconds: Math.round((Date.now() - state.createdAt) / 1000) });
    dispatch({ type: 'SET_STAGE', payload: 4 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto px-4 py-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1E3A8A]">紧急-重要矩阵</h2>
        <p className="text-sm text-gray-500 mt-1">
          拖拽任务卡片到不同象限，调整优先级顺序
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
                「紧急」往往是主观感受。弹性时间的任务可以被推迟或委托；真正无法更改截止日的任务才是硬紧急。
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
        <EisenhowerMatrix />
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
