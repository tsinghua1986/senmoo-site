import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDecision, exportStateAsJSON } from '../store/DecisionContext';
import { callStage4, getConsecutiveFailures, ApiError } from '../services/api';
import { trackEvent } from '../services/analytics';
import html2canvas from 'html2canvas';
import PosterExport from './PosterExport';

export default function Stage4Action() {
  const { state, dispatch, apiConfig } = useDecision();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // FIX: Use useEffect instead of useState side-effect
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    if (!state.actionPlan.recommendation) {
      generateActionPlan();
    }
  }, [initialized]);

  const generateActionPlan = async () => {
    setLoading(true);
    setError('');
    try {
      // Build model summary
      let modelSummary = '';
      if (state.decisionType === 'single' && state.modelData.franklin) {
        const f = state.modelData.franklin;
        const activePros = f.pros.filter(p => !p.cancelled);
        const activeCons = f.cons.filter(c => !c.cancelled);
        const prosTotal = activePros.reduce((s, i) => s + i.weight, 0);
        const consTotal = activeCons.reduce((s, i) => s + i.weight, 0);
        modelSummary = `富兰克林天平：赞成总分 ${prosTotal.toFixed(1)}，反对总分 ${consTotal.toFixed(1)}。${prosTotal > consTotal ? '赞成方占优' : '反对方占优'}。`;
      } else if (state.decisionType === 'multi' && state.modelData.wadm) {
        const w = state.modelData.wadm;
        const totals = w.options.map(opt => {
          let total = 0;
          for (const crit of w.criteria) {
            total += (w.scores[opt.id]?.[crit.id] ?? 5) * crit.weight;
          }
          return `${opt.name}: ${total.toFixed(1)}分`;
        });
        modelSummary = `加权决策矩阵：${totals.join('，')}。`;
      } else if (state.decisionType === 'priority' && state.modelData.eisenhower) {
        const e = state.modelData.eisenhower;
        const doFirst = e.tasks.filter(t => t.urgency >= 6 && t.importance >= 6);
        modelSummary = `紧急-重要矩阵：共 ${e.tasks.length} 个任务，其中 ${doFirst.length} 个需要立即执行。`;
      }

      // Extract hard constraints for single decisions (from factors)
      let hardConstraints: string[] | undefined;
      if (state.decisionType === 'single' && state.modelData.franklin) {
        hardConstraints = state.modelData.franklin.cons
          .filter(c => c.isHard && !c.cancelled)
          .map(c => c.text);
      }

      // Soft constraints from stage 2
      const softConstraints = state.constraints?.soft;

      const result = await callStage4(apiConfig, {
        realIssue: state.realIssue,
        decisionType: state.decisionType,
        hardConstraints,
        softConstraints,
        modelSummary,
      });

      dispatch({ type: 'SET_ACTION_PLAN', payload: result });
      trackEvent('stage_completed', { stage: 4, duration_seconds: Math.round((Date.now() - state.createdAt) / 1000) });
    } catch (err) {
      const msg = err instanceof ApiError
        ? (getConsecutiveFailures() >= 3
          ? `${err.message} 建议检查 API Key 是否过期或余额是否充足`
          : err.message)
        : (err instanceof Error ? err.message : '生成失败，请重试');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ===== DOM-based Poster Export via html2canvas ===== */
  const handleExportPoster = async () => {
    if (!posterRef.current) { console.warn("[Poster] posterRef is null"); return; }
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#FAF9F6',
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `decision-lens-${state.id.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      trackEvent('action_exported', { format: 'png_poster' });
    } catch (err) {
      console.error('[Poster] Export failed:', err);
      setError('海报导出失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleExportPDF = () => {
    trackEvent('action_exported', { format: 'pdf' });
    window.print();
  };

  const handleReset = () => {
    if (confirm('确定要清空本次决策的所有数据吗？此操作不可恢复。')) {
      trackEvent('decision_abandoned', {
        last_stage: state.currentStage,
        total_duration: Math.round((Date.now() - state.createdAt) / 1000),
      });
      localStorage.clear();
      dispatch({ type: 'RESET' });
    }
  };

  const handleExportJSON = () => {
    const json = exportStateAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `decision-lens-backup-${state.id.slice(0, 8)}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const { actionPlan } = state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 animate-breathe flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">正在为你提炼破冰行动...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-6 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={generateActionPlan} className="underline hover:no-underline whitespace-nowrap">重试</button>
        </div>
      )}

      {/* Diagnosis Card */}
      {actionPlan.recommendation && !loading && (
        <div ref={cardRef} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 print:shadow-none print:border-0">
          {/* Header */}
          <div className="text-center mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">
              「决策透镜」诊断单
            </h2>
            <p className="text-sm text-gray-400">
              {new Date(state.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>

          {/* Real Issue */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">你的真实问题</h3>
            <p className="text-lg text-gray-800 leading-relaxed">{state.realIssue}</p>
          </div>

          {/* Recommendation */}
          <div className="mb-6 bg-teal-50 rounded-xl p-5 border border-teal-100">
            <h3 className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider mb-2">建议方向</h3>
            <p className="text-base text-gray-800 leading-relaxed">{actionPlan.recommendation}</p>
          </div>

          {/* Analysis */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">深度分析</h3>
            <p className="text-base text-gray-700 leading-relaxed">{actionPlan.analysisText}</p>
          </div>

          {/* Test Action - Hero */}
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
            <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
              最小破冰实验
            </h3>
            <p className="text-base text-gray-800 leading-relaxed font-medium">{actionPlan.testAction}</p>
          </div>

          {/* Verification Rule */}
          {actionPlan.verificationRule && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200">
              <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-3">
                验证规则 · 如何判断实验结果
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex gap-3">
                  <span className="text-indigo-400 flex-shrink-0">📏</span>
                  <div>
                    <span className="text-gray-500 text-xs">指标：</span>
                    <span className="text-gray-800">{actionPlan.verificationRule.metric}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-400 flex-shrink-0">🎯</span>
                  <div>
                    <span className="text-gray-500 text-xs">阈值：</span>
                    <span className="text-gray-800">{actionPlan.verificationRule.threshold}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-400 flex-shrink-0">⏱️</span>
                  <div>
                    <span className="text-gray-500 text-xs">时间窗口：</span>
                    <span className="text-gray-800">{actionPlan.verificationRule.timeframe}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                  <div className="bg-teal-50/70 rounded-lg p-2.5">
                    <div className="text-xs text-teal-700 font-semibold mb-1">✅ 若达到</div>
                    <div className="text-xs text-gray-700">{actionPlan.verificationRule.successAction}</div>
                  </div>
                  <div className="bg-red-50/70 rounded-lg p-2.5">
                    <div className="text-xs text-red-700 font-semibold mb-1">❌ 若未达到</div>
                    <div className="text-xs text-gray-700">{actionPlan.verificationRule.failureAction}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Ambiguity */}
          {actionPlan.keyAmbiguity && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">剩余不确定性</h3>
              <p className="text-sm text-gray-500 italic">{actionPlan.keyAmbiguity}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-300">由「决策透镜」Decision Lens 生成</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {actionPlan.recommendation && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          <button
            onClick={handleExportPoster}
            className="px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0D6B63] transition-colors"
          >
            下载海报 PNG
          </button>
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl border border-[#0F766E] text-[#0F766E] text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            导出 PDF
          </button>
          <button
            onClick={handleExportJSON}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
          >
            导出 JSON
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
          >
            开始新决策
          </button>
        </motion.div>
      )}
    
      {/* Hidden PosterExport component for html2canvas capture (pure RGB, no Tailwind) */}
      {actionPlan.recommendation && !loading && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PosterExport ref={posterRef} />
        </div>
      )}
</motion.div>
  );
}

