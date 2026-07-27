import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { useDecision } from "../../store/DecisionContext";
import { trackEvent } from "../../services/analytics";
import type { FlowFactor } from "../../types";

export default function FlowA_Factors() {
  const { state, dispatch } = useDecision();
  const factors = state.factors;

  const [pros, setPros] = useState<FlowFactor[]>(factors?.pros ?? []);
  const [cons, setCons] = useState<FlowFactor[]>(factors?.cons ?? []);
  const [newPro, setNewPro] = useState("");
  const [newCon, setNewCon] = useState("");

  // Group by isHard
  const hardPros = useMemo(() => pros.filter((f) => f.isHard), [pros]);
  const softPros = useMemo(() => pros.filter((f) => !f.isHard), [pros]);
  const hardCons = useMemo(() => cons.filter((f) => f.isHard), [cons]);
  const softCons = useMemo(() => cons.filter((f) => !f.isHard), [cons]);

  const addFactor = (side: "pros" | "cons", text: string) => {
    const item: FlowFactor = { id: uuidv4(), text, weight: side === "pros" ? 6 : 4, isHard: false };
    if (side === "pros") setPros((prev) => [...prev, item]);
    else setCons((prev) => [...prev, item]);
    trackEvent("factor_added", { side });
  };

  const removeFactor = (side: "pros" | "cons", id: string) => {
    if (side === "pros") setPros((prev) => prev.filter((f) => f.id !== id));
    else setCons((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFactor = (side: "pros" | "cons", id: string, updates: Partial<FlowFactor>) => {
    const setter = side === "pros" ? setPros : setCons;
    setter((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleConfirm = () => {
    const flowFactors = { pros, cons };
    dispatch({
      type: "SET_STAGE2_RESULT",
      payload: {
        realIssue: state.realIssue,
        decisionType: "single",
        hiddenAssumptions: state.hiddenAssumptions,
        factors: flowFactors,
        flowStep: 1,
      },
    });
    dispatch({
      type: "SET_FRANKLIN_DATA",
      payload: {
        pros: pros.map((f) => ({ ...f })),
        cons: cons.map((f) => ({ ...f })),
      },
    });
    dispatch({ type: 'SET_STAGE', payload: 3 });
    trackEvent("factors_confirmed", { proCount: pros.length, conCount: cons.length });
  };

  const renderFactorCard = (f: FlowFactor, side: "pros" | "cons") => (
    <div key={f.id} className="bg-white rounded-lg p-3 shadow-sm space-y-2">
      <div className="flex items-start gap-2">
        <input
          value={f.text}
          onChange={(e) => updateFactor(side, f.id, { text: e.target.value })}
          className="flex-1 text-sm border-none outline-none bg-transparent text-gray-700"
        />
        <button
          onClick={() => removeFactor(side, f.id)}
          className="text-gray-300 hover:text-red-400 text-xs mt-0.5"
        >&times;</button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={1} max={10} step={0.1} value={f.weight}
          onChange={(e) => updateFactor(side, f.id, { weight: parseFloat(e.target.value) })}
          className="flex-1"
        />
        <span className="text-xs font-mono text-gray-500 w-8 text-right">{f.weight.toFixed(1)}</span>
        <button
          onClick={() => updateFactor(side, f.id, { isHard: !f.isHard })}
          className={`text-xs px-1.5 py-0.5 rounded ${f.isHard ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
          title={f.isHard ? "硬约束（不可违背）" : "软约束（可以挑战）"}
        >{f.isHard ? "\u{1F512}" : "\u{1F513}"}</button>
      </div>
    </div>
  );

  const renderGroup = (items: FlowFactor[], side: "pros" | "cons", label: string, labelColor: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className={`text-xs font-semibold ${labelColor} mb-1.5`}>{label}</p>
        <div className="space-y-3">
          {items.map((f) => renderFactorCard(f, side))}
        </div>
      </div>
    );
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
          <div className="flex items-start gap-3 mb-4">
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

      {/* Factors Editor */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 text-center mb-1">因素提取与约束分类</h3>
        <p className="text-sm text-gray-500 text-center mb-2">
          AI 已初步识别了推动和阻碍因素，请确认或调整
        </p>
        <p className="text-xs text-gray-400 text-center mb-6">
          &#128274; 硬约束 = 不可违背的客观限制（如：存款只够撑3个月） &#128275; 软约束 = 可以挑战的主观判断（如：爸妈会觉得不稳定）
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pros */}
          <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100">
            <h4 className="text-sm font-semibold text-[#0F766E] mb-3">推动因素 (Pros)</h4>
            {renderGroup(hardPros, "pros", "\u{1F512} 硬约束（不可违背的客观限制）", "text-red-600")}
            {renderGroup(softPros, "pros", "\u{1F513} 软约束（可以挑战的主观判断）", "text-gray-500")}
            {pros.length === 0 && <p className="text-xs text-gray-400 text-center py-4">暂无推动因素</p>}
            <div className="mt-3 flex gap-2">
              <input
                value={newPro}
                onChange={(e) => setNewPro(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newPro.trim()) { addFactor("pros", newPro.trim()); setNewPro(""); } }}
                placeholder="添加推动因素..."
                className="flex-1 text-sm border border-teal-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-teal-400 bg-white"
              />
              <button
                onClick={() => { if (newPro.trim()) { addFactor("pros", newPro.trim()); setNewPro(""); } }}
                className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
                disabled={!newPro.trim()}
              >+</button>
            </div>
          </div>

          {/* Cons */}
          <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
            <h4 className="text-sm font-semibold text-red-600 mb-3">阻碍因素 (Cons)</h4>
            {renderGroup(hardCons, "cons", "\u{1F512} 硬约束（不可违背的客观限制）", "text-red-600")}
            {renderGroup(softCons, "cons", "\u{1F513} 软约束（可以挑战的主观判断）", "text-gray-500")}
            {cons.length === 0 && <p className="text-xs text-gray-400 text-center py-4">暂无阻碍因素</p>}
            <div className="mt-3 flex gap-2">
              <input
                value={newCon}
                onChange={(e) => setNewCon(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newCon.trim()) { addFactor("cons", newCon.trim()); setNewCon(""); } }}
                placeholder="添加阻碍因素..."
                className="flex-1 text-sm border border-red-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-red-400 bg-white"
              />
              <button
                onClick={() => { if (newCon.trim()) { addFactor("cons", newCon.trim()); setNewCon(""); } }}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
                disabled={!newCon.trim()}
              >+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleConfirm}
          disabled={pros.length === 0 && cons.length === 0}
          className="px-8 py-3 rounded-2xl bg-[#0F766E] text-white font-semibold hover:bg-[#0D6B63] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/20"
        >
          确认因素，进入加权相消
        </button>
      </div>
    </motion.div>
  );
}
