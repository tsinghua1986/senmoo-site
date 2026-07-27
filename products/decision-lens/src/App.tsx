import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DecisionProvider, useDecision, exportStateAsJSON } from './store/DecisionContext';
import StageIndicator from './components/StageIndicator';
import Stage1InputDump from './components/Stage1InputDump';
import Stage4Action from './components/Stage4Action';
import FlowA_Factors from './components/flows/FlowA_Factors';
import FlowA_Weighing from './components/flows/FlowA_Weighing';
import FlowB_Options from './components/flows/FlowB_Options';
import FlowB_Scoring from './components/flows/FlowB_Scoring';
import FlowC_Rating from './components/flows/FlowC_Rating';
import FlowC_Quadrant from './components/flows/FlowC_Quadrant';

function AppContent() {
  const { state, dispatch, hasRestorableSession, markSessionRestored } = useDecision();
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);

  // Session restore detection
  useEffect(() => {
    if (hasRestorableSession) {
      setShowRestoreDialog(true);
    }
  }, [hasRestorableSession]);

  // Storage warning listener
  useEffect(() => {
    const handler = () => setStorageWarning(true);
    window.addEventListener('dl-storage-warning', handler);
    return () => window.removeEventListener('dl-storage-warning', handler);
  }, []);

  const handleRestore = () => {
    // State is already loaded from LocalStorage in the reducer initializer;
    // we just need to restore the actual currentStage from the saved data
    try {
      const saved = localStorage.getItem('decision_lens_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'RESTORE_STATE', payload: parsed });
      }
    } catch { /* ignore */ }
    setShowRestoreDialog(false);
    markSessionRestored();
  };

  const handleDiscard = () => {
    dispatch({ type: 'RESET' });
    setShowRestoreDialog(false);
    markSessionRestored();
  };

  const handleExportAndClean = useCallback(() => {
    const json = exportStateAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decision-lens-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStorageWarning(false);
  }, []);

  const renderStage = () => {
    switch (state.currentStage) {
      case 1: return <Stage1InputDump />;              // Clarify
      case 4: return <Stage4Action />;                  // Decide
      case 2: // Deconstruct — route by decisionType
        switch (state.decisionType) {
          case 'single':   return <FlowA_Factors />;
          case 'multi':    return <FlowB_Options />;
          case 'priority': return <FlowC_Rating />;
        }
        return <Stage1InputDump />;
      case 3: // Simplify — route by decisionType
        switch (state.decisionType) {
          case 'single':   return <FlowA_Weighing />;
          case 'multi':    return <FlowB_Scoring />;
          case 'priority': return <FlowC_Quadrant />;
        }
        return <Stage1InputDump />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 print:hidden">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F766E] to-[#1E3A8A] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">决策透镜</span>
          </div>

          <StageIndicator />
        </div>
      </header>

      {/* Main Content */}
      <main className="print:pt-0">
        <AnimatePresence mode="wait">
          <motion.div key={`${state.currentStage}-${state.decisionType}`}>
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Session Restore Dialog */}
      <AnimatePresence>
        {showRestoreDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0F766E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">检测到未完成的决策</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                检测到你有一个正在处理的决策，是否继续上次的进度？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDiscard}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  重新开始
                </button>
                <button
                  onClick={handleRestore}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#0F766E] hover:bg-[#0D6B63] transition-colors"
                >
                  继续决策
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage Warning Toast */}
      <AnimatePresence>
        {storageWarning && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-xl px-5 py-3 shadow-lg flex items-center gap-3 max-w-md print:hidden"
          >
            <span className="text-red-500 text-lg">&#9888;</span>
            <p className="text-sm text-red-700 flex-1">
              本地存储空间不足，建议导出备份后清理历史缓存
            </p>
            <button
              onClick={handleExportAndClean}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors whitespace-nowrap"
            >
              导出 JSON
            </button>
            <button
              onClick={() => setStorageWarning(false)}
              className="text-red-300 hover:text-red-500 text-lg"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <DecisionProvider>
      <AppContent />
    </DecisionProvider>
  );
}
