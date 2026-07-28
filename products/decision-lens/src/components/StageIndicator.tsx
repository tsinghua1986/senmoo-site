import { motion } from 'framer-motion';
import { useDecision } from '../store/DecisionContext';

const STAGE_LABELS = ['澄清', '解构', '简化', '拍板'];

export default function StageIndicator() {
  const { state, dispatch } = useDecision();
  const current = state.currentStage;

  const handleClick = (num: number) => {
    if (num < current) {
      dispatch({ type: 'SET_STAGE', payload: num as 1 | 2 | 3 | 4 });
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-4 px-4">
      {STAGE_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isCurrent = stepNum === current;

        return (
          <div key={i} className="flex items-center">
            {/* Step */}
            <button
              onClick={() => handleClick(stepNum)}
              disabled={stepNum > current}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isCurrent
                  ? 'bg-[#C67C5B] text-white shadow-md'
                  : isCompleted
                    ? 'bg-orange-100 text-[#C67C5B] cursor-pointer hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-400 cursor-default'
                }
              `}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {stepNum}
                </span>
              )}
              <span className="hidden sm:inline">{label}</span>
            </button>

            {/* Connector */}
            {i < STAGE_LABELS.length - 1 && (
              <div className="w-4 sm:w-8 h-0.5 mx-1">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                  style={{ backgroundColor: isCompleted ? '#C67C5B' : '#E5E7EB' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
