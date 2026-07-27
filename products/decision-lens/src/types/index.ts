/* ===== Decision Lens - Type Definitions ===== */

export type DecisionType = 'single' | 'multi' | 'priority';

/* ===== Flow Step Labels ===== */
export const FLOW_STEP_LABELS: Record<DecisionType, string[]> = {
  single: ['因素提取', '加权相消', '行动'],
  multi: ['选项确认', '打分排名', '行动'],
  priority: ['任务评级', '四象限', '行动'],
};

/* ===== Flow A: Factor (single decision) ===== */
export interface FlowFactor {
  id: string;
  text: string;
  weight: number;    // 1-10, step 0.1
  isHard: boolean;   // visual hint only
  cancelled?: boolean;
}

/* ===== Flow A Data: Franklin-style pros/cons ===== */
export interface FranklinData {
  pros: FlowFactor[];
  cons: FlowFactor[];
}

/* Legacy alias for backward compat within components */
export type FranklinItem = FlowFactor;

/* ===== Flow B: WADM (multi decision) ===== */
export interface WadmOption {
  id: string;
  name: string;
}

export interface WadmCriterion {
  id: string;
  name: string;
  weight: number; // 1-5, integer
}

export interface WadmData {
  options: WadmOption[];
  criteria: WadmCriterion[];
  scores: Record<string, Record<string, number>>; // optionId -> criterionId -> score (1-10)
}

/* ===== Flow C: Eisenhower (priority decision) ===== */
export interface EisenhowerTask {
  id: string;
  text: string;
  urgency: number;    // 1-10
  importance: number; // 1-10
  order: number;      // order within its quadrant
  isHardDeadline?: boolean; // true = 客观硬性截止日; false = 主观期望时间
}

export interface EisenhowerData {
  tasks: EisenhowerTask[];
}

/* ===== Shared Types ===== */
export interface DialogueMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface VerificationRule {
  metric: string;
  threshold: string;
  timeframe: string;
  successAction: string;
  failureAction: string;
}

export interface ActionPlan {
  recommendation: string;
  analysisText: string;
  testAction: string;
  keyAmbiguity?: string;
  verificationRule?: VerificationRule;
}

/* ===== Main Decision State ===== */
export interface DecisionContext {
  id: string;
  createdAt: number;
  updatedAt: number;
  currentStage: 1 | 2 | 3 | 4;      // 1=Clarify, 2=Deconstruct, 3=Simplify, 4=Decide
  flowStep: number;                   // 0-based step within the flow
  rawInput: string;
  realIssue: string;
  hiddenAssumptions: string[];
  decisionType: DecisionType;
  /* Flow-specific data (only the active flow's data is populated) */
  factors?: { pros: FlowFactor[]; cons: FlowFactor[] };
  /* Temp storage for AI-extracted flow data (consumed by flow components) */
  options?: string[];
  criteria?: string[];
  tasks?: Array<{ text: string; urgency: number; importance: number }>;
  /* Hard/soft constraints extracted during Deconstruct */
  constraints?: { hard: string[]; soft: string[] };
  modelData: {
    franklin?: FranklinData;
    wadm?: WadmData;
    eisenhower?: EisenhowerData;
  };
  actionPlan: ActionPlan;
  dialogueHistory: DialogueMessage[];
}

/* ===== API Configuration ===== */
export type ApiProvider = 'openai' | 'anthropic' | 'custom';

export interface ApiConfig {
  provider: ApiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/* ===== AI Response Schemas ===== */
export interface Stage2Response {
  realIssue: string;
  decisionType: DecisionType;
  hiddenAssumptions: string[];
  followUpQuestion: string;
  /* Flow A: factors for single decision */
  factors?: { pros: Array<{ text: string; weight: number; isHard: boolean }>; cons: Array<{ text: string; weight: number; isHard: boolean }> };
  /* Flow B: options & criteria for multi decision */
  options?: string[];
  criteria?: string[];
  /* Flow C: tasks for priority decision */
  tasks?: Array<{ text: string; urgency: number; importance: number }>;
  /* Hard & soft constraints (all flows) */
  hardConstraints?: string[];
  softConstraints?: string[];
}

export interface Stage4Response {
  recommendation: string;
  analysisText: string;
  testAction: string;
  keyAmbiguity?: string;
  verificationRule?: {
    metric: string;
    threshold: string;
    timeframe: string;
    successAction: string;
    failureAction: string;
  };
}

/* ===== Analytics Events ===== */
export type AnalyticsEventType =
  | 'decision_started'
  | 'stage_completed'
  | 'constraint_sorted'
  | 'slider_adjusted'
  | 'action_exported'
  | 'decision_abandoned'
  | 'factors_confirmed'
  | 'factor_reordered'
  | 'factor_added'
  | 'cancel_out_clicked'
  | 'matrix_scored'
  | 'quadrant_assigned';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
}
