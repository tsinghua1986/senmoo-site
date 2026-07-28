import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { useDecision } from "../store/DecisionContext";
import { callStage2, ApiError, getConsecutiveFailures } from "../services/api";
import { trackEvent } from "../services/analytics";
import type { FlowFactor, Stage2Response, DialogueMessage } from "../types";
import AuthModal from "./AuthModal";

const supabase = createClient(
  "https://qwkqotkazgqpzqtjecvu.supabase.co",
  "sb_publishable_yHdsg6K1ZON8QghpuhpElA_cptNP2MG"
);

const SCENE_TAGS = [
  { label: "职场转型", prompt: "我在考虑是否要换一份工作/转行，目前的状态让我很纠结..." },
  { label: "个人情感", prompt: "我在一段关系中感到困惑，不确定应该继续还是放手..." },
  { label: "大件消费", prompt: "我在犹豫是否要做一笔大额消费/投资，担心风险但又很心动..." },
  { label: "生活琐事", prompt: "生活中有几件事情需要决定优先级，让我感到焦虑和混乱..." },
];

export default function Stage1InputDump() {
  const { state, dispatch, apiConfig } = useDecision();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [text, setText] = useState(state.rawInput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [clarifyResult, setClarifyResult] = useState<Stage2Response | null>(null);
  const [showTransition, setShowTransition] = useState(false);

  const handleSceneInject = (prompt: string) => {
    setText(prompt);
  };

  const canSubmit = text.trim().length >= 10;

  const dispatchResult = (result: Stage2Response) => {
    let factors: { pros: FlowFactor[]; cons: FlowFactor[] } | undefined;
    if (result.factors) {
      factors = {
        pros: result.factors.pros.map((f) => ({ id: uuidv4(), ...f })),
        cons: result.factors.cons.map((f) => ({ id: uuidv4(), ...f })),
      };
    }

    dispatch({
      type: "SET_STAGE2_RESULT",
      payload: {
        realIssue: result.realIssue,
        decisionType: result.decisionType,
        hiddenAssumptions: result.hiddenAssumptions,
        factors,
        options: result.options,
        criteria: result.criteria,
        tasks: result.tasks,
        constraints: result.hardConstraints
          ? { hard: result.hardConstraints, soft: result.softConstraints ?? [] }
          : undefined,
        flowStep: 0,
      },
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;

    // 检查登录状态
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      setShowAuthModal(true);
      setPendingSubmit(true);
      return;
    }

    doSubmit();
  };

  const doSubmit = async () => {
    if (!canSubmit || loading) return;
    dispatch({ type: "SET_RAW_INPUT", payload: text });
    setLoading(true);
    setError("");
    try {
      const result = await callStage2(apiConfig, text);

      if (result.followUpQuestion && result.followUpQuestion.trim()) {
        // AI has a follow-up question - show it, don't advance
        setClarifyResult(result);
        setFollowUp(result.followUpQuestion);
      } else {
        // No follow-up - show transition card then advance
        dispatchResult(result);
        setShowTransition(true);
        trackEvent("stage_completed", { stage: 1 });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? getConsecutiveFailures() >= 3
            ? `${err.message} 建议检查 API Key 是否过期或余额是否充足`
            : err.message
          : err instanceof Error
            ? err.message
            : "分析失败，请重试";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpAnswer.trim() || loading) return;
    setLoading(true);
    setError("");

    // Record dialogue
    const nowTs = Date.now();
    dispatch({ type: "ADD_DIALOGUE", payload: { role: "assistant", content: followUp, timestamp: nowTs } });
    dispatch({ type: "ADD_DIALOGUE", payload: { role: "user", content: followUpAnswer, timestamp: nowTs + 1 } });

    try {
      const updatedHistory: DialogueMessage[] = [
        ...state.dialogueHistory,
        { role: "assistant", content: followUp, timestamp: nowTs },
        { role: "user", content: followUpAnswer, timestamp: nowTs + 1 },
      ];
      // Second round - force advance regardless
      const result = await callStage2(apiConfig, followUpAnswer, updatedHistory);
      // Merge with original result
      const merged: Stage2Response = {
        ...clarifyResult!,
        realIssue: result.realIssue || clarifyResult!.realIssue,
        decisionType: result.decisionType || clarifyResult!.decisionType,
        hiddenAssumptions: result.hiddenAssumptions?.length
          ? result.hiddenAssumptions
          : clarifyResult!.hiddenAssumptions,
        factors: result.factors || clarifyResult!.factors,
        options: result.options || clarifyResult!.options,
        criteria: result.criteria || clarifyResult!.criteria,
        tasks: result.tasks || clarifyResult!.tasks,
        hardConstraints: result.hardConstraints || clarifyResult!.hardConstraints,
        softConstraints: result.softConstraints || clarifyResult!.softConstraints,
      };
      dispatchResult(merged);
      setShowTransition(true);
      trackEvent("stage_completed", { stage: 1 });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? getConsecutiveFailures() >= 3
            ? `${err.message} 建议检查 API Key 是否过期或余额是否充足`
            : err.message
          : err instanceof Error
            ? err.message
            : "分析失败，请重试";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterStage2 = () => {
    setShowTransition(false);
  };

  /* ===== Transition Card ===== */
  if (showTransition) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-3xl mx-auto px-4 py-8"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#C67C5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#B89770]">我理解了你的问题</h2>
          </div>

          <div className="mb-6 bg-orange-50 rounded-xl p-5 border border-orange-100">
            <p className="text-xs font-semibold text-[#C67C5B] uppercase tracking-wider mb-2">你的真实问题</p>
            <p className="text-base text-gray-800 leading-relaxed">{state.realIssue}</p>
          </div>

          {state.hiddenAssumptions.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">发现的隐性假设</p>
              <div className="space-y-2">
                {state.hiddenAssumptions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <span className="text-amber-500 mt-0.5">&#x1F4A1;</span>
                    <p className="text-sm text-gray-700">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleEnterStage2}
            className="w-full py-3 rounded-2xl bg-[#C67C5B] text-white font-semibold text-base hover:bg-[#B06D50] transition-all shadow-lg shadow-orange-600/20"
          >
            继续拆解 &rarr;
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#B89770] mb-3">
          决策透镜
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          把你脑子里的纠结全部倒出来，让 AI 帮你理清楚
        </p>
      </div>

      {/* Text Area */}
      <div className="relative mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="我现在不知道该不该从这家呆了三年的外企辞职...老板是个蠢货，我每天都处于严重的精神内耗中，但我现在有房贷，又怕辞了找不到更好的，可是我真的很喜欢烘焙，很想开一家自己的面包店..."
          rows={8}
          className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-base leading-relaxed text-gray-800 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#C67C5B]/30 focus:border-[#C67C5B] transition-all shadow-sm"
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-300">
          {text.length} 字
        </div>
      </div>

      {/* Validation hint */}
      {!canSubmit && text.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-sm mb-3"
        >
          请至少用一句话描述你正在纠结的事情
        </motion.p>
      )}

      {/* Scene Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-xs text-gray-400 leading-7">快捷场景：</span>
        {SCENE_TAGS.map((tag) => (
          <button
            key={tag.label}
            onClick={() => handleSceneInject(tag.prompt)}
            className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs hover:bg-orange-50 hover:text-[#C67C5B] transition-colors"
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Follow-up Question */}
      <AnimatePresence>
        {followUp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#C67C5B] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#C67C5B] mb-1">AI 分析师追问</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{followUp}</p>
                </div>
              </div>
              <textarea
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="补充说明你的情况..."
                rows={3}
                className="w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-[#C67C5B]/30 focus:border-[#C67C5B] transition-all"
              />
              <button
                onClick={handleFollowUpSubmit}
                disabled={!followUpAnswer.trim() || loading}
                className="mt-3 w-full py-2.5 rounded-xl bg-[#C67C5B] text-white text-sm font-medium hover:bg-[#B06D50] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "分析中..." : "回答并继续"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4"
        >
          {error}
        </motion.div>
      )}

      {/* Submit Button */}
      {!followUp && (
        <>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full py-4 rounded-2xl bg-[#C67C5B] text-white font-semibold text-base hover:bg-[#B06D50] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在透视大脑认知中...
              </span>
            ) : (
              "开始拆解"
            )}
          </button>
          {showAuthModal && (
            <AuthModal
              onClose={() => { setShowAuthModal(false); setPendingSubmit(false); }}
              onAuthSuccess={() => { setShowAuthModal(false); if (pendingSubmit) { setPendingSubmit(false); doSubmit(); } }}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
