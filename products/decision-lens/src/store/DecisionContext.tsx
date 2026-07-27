import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DecisionContext, DecisionType, FlowFactor, FranklinData, FranklinItem, WadmData, EisenhowerData, ActionPlan, DialogueMessage, ApiConfig } from '../types';
import { API_CONFIG } from '../config';

/* ===== Initial State ===== */
const createInitialContext = (): DecisionContext => ({
  id: uuidv4(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentStage: 1,
  flowStep: 0,
  rawInput: '',
  realIssue: '',
  hiddenAssumptions: [],
  decisionType: 'single',
  modelData: {},
  actionPlan: { recommendation: '', analysisText: '', testAction: '' },
  dialogueHistory: [],
});

/* ===== Actions ===== */
type Action =
  | { type: 'SET_STAGE'; payload: 1 | 2 | 3 | 4 }
  | { type: 'SET_RAW_INPUT'; payload: string }
  | { type: 'SET_STAGE2_RESULT'; payload: {
      realIssue: string;
      decisionType: DecisionType;
      hiddenAssumptions: string[];
      factors?: { pros: FlowFactor[]; cons: FlowFactor[] };
      options?: string[];
      criteria?: string[];
      tasks?: Array<{ text: string; urgency: number; importance: number }>;
      constraints?: { hard: string[]; soft: string[] };
      flowStep?: number;
    } }
  | { type: 'ADD_DIALOGUE'; payload: DialogueMessage }
  | { type: 'SET_FLOW_STEP'; payload: number }
  | { type: 'SET_FRANKLIN_DATA'; payload: FranklinData }
  | { type: 'SET_WADM_DATA'; payload: WadmData }
  | { type: 'SET_EISENHOWER_DATA'; payload: EisenhowerData }
  | { type: 'SET_ACTION_PLAN'; payload: ActionPlan }
  | { type: 'UPDATE_FRANKLIN_ITEM'; payload: { side: 'pros' | 'cons'; id: string; weight: number } }
  | { type: 'UPDATE_FRANKLIN_TEXT'; payload: { side: 'pros' | 'cons'; id: string; text: string } }
  | { type: 'ADD_FRANKLIN_ITEM'; payload: { side: 'pros' | 'cons'; text: string; weight: number } }
  | { type: 'CANCEL_OUT_FRANKLIN'; payload: { proIds: string[]; conIds: string[] } }
  | { type: 'ABOLISH_FRANKLIN_ITEM'; payload: { side: 'pros' | 'cons'; id: string } }
  | { type: 'UPDATE_WADM_SCORE'; payload: { optionId: string; criterionId: string; score: number } }
  | { type: 'UPDATE_WADM_WEIGHT'; payload: { criterionId: string; weight: number } }
  | { type: 'UPDATE_EISENHOWER_TASK'; payload: { id: string; updates: Partial<{ urgency: number; importance: number; order: number }> } }
  | { type: 'DELETE_EISENHOWER_TASK'; payload: { id: string } }
  | { type: 'SET_CONSTRAINTS'; payload: { hard: string[]; soft: string[] } }
  | { type: 'MERGE_WADM_CRITERIA'; payload: { keepId: string; removeId: string; mergedName: string } }
  | { type: 'CLEAR_MODEL_DATA' }
  | { type: 'RESTORE_STATE'; payload: DecisionContext }
  | { type: 'RESET' };

function reducer(state: DecisionContext, action: Action): DecisionContext {
  const updated = { ...state, updatedAt: Date.now() };
  switch (action.type) {
    case 'SET_STAGE':
      return { ...updated, currentStage: action.payload };
    case 'SET_RAW_INPUT':
      return { ...updated, rawInput: action.payload };
    case 'SET_STAGE2_RESULT':
      return {
        ...updated,
        realIssue: action.payload.realIssue,
        decisionType: action.payload.decisionType,
        hiddenAssumptions: action.payload.hiddenAssumptions,
        factors: action.payload.factors,
        options: action.payload.options,
        criteria: action.payload.criteria,
        tasks: action.payload.tasks,
        constraints: action.payload.constraints,
        flowStep: action.payload.flowStep ?? 0,
        currentStage: 2,
      };
    case 'ADD_DIALOGUE':
      return { ...updated, dialogueHistory: [...state.dialogueHistory, action.payload] };
    case 'SET_FLOW_STEP':
      return { ...updated, flowStep: action.payload };
    case 'SET_FRANKLIN_DATA':
      return { ...updated, modelData: { ...state.modelData, franklin: action.payload } };
    case 'SET_WADM_DATA':
      return { ...updated, modelData: { ...state.modelData, wadm: action.payload } };
    case 'SET_EISENHOWER_DATA':
      return { ...updated, modelData: { ...state.modelData, eisenhower: action.payload } };
    case 'SET_ACTION_PLAN':
      return { ...updated, actionPlan: action.payload };
    case 'UPDATE_FRANKLIN_ITEM': {
      const franklin = state.modelData.franklin;
      if (!franklin) return state;
      const side = action.payload.side;
      const items = franklin[side].map(item =>
        item.id === action.payload.id ? { ...item, weight: action.payload.weight } : item
      );
      return { ...updated, modelData: { ...state.modelData, franklin: { ...franklin, [side]: items } } };
    }
    case 'UPDATE_FRANKLIN_TEXT': {
      const franklin = state.modelData.franklin;
      if (!franklin) return state;
      const side = action.payload.side;
      const items = franklin[side].map(item =>
        item.id === action.payload.id ? { ...item, text: action.payload.text } : item
      );
      return { ...updated, modelData: { ...state.modelData, franklin: { ...franklin, [side]: items } } };
    }
    case 'ADD_FRANKLIN_ITEM': {
      const franklin = state.modelData.franklin;
      if (!franklin) return state;
      const side = action.payload.side;
      const newItem: FranklinItem = {
        id: uuidv4(),
        text: action.payload.text,
        weight: action.payload.weight,
        isHard: false,
      };
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          franklin: { ...franklin, [side]: [...franklin[side], newItem] },
        },
      };
    }
    case 'CANCEL_OUT_FRANKLIN': {
      const franklin = state.modelData.franklin;
      if (!franklin) return state;
      const { proIds, conIds } = action.payload;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          franklin: {
            pros: franklin.pros.map(p => proIds.includes(p.id) ? { ...p, cancelled: true } : p),
            cons: franklin.cons.map(c => conIds.includes(c.id) ? { ...c, cancelled: true } : c),
          },
        },
      };
    }
    case 'ABOLISH_FRANKLIN_ITEM': {
      const franklin = state.modelData.franklin;
      if (!franklin) return state;
      const side = action.payload.side;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          franklin: {
            ...franklin,
            [side]: franklin[side].filter(item => item.id !== action.payload.id),
          },
        },
      };
    }
    case 'UPDATE_WADM_SCORE': {
      const wadm = state.modelData.wadm;
      if (!wadm) return state;
      const { optionId, criterionId, score } = action.payload;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          wadm: {
            ...wadm,
            scores: {
              ...wadm.scores,
              [optionId]: { ...wadm.scores[optionId], [criterionId]: score },
            },
          },
        },
      };
    }
    case 'UPDATE_WADM_WEIGHT': {
      const wadm = state.modelData.wadm;
      if (!wadm) return state;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          wadm: {
            ...wadm,
            criteria: wadm.criteria.map(c =>
              c.id === action.payload.criterionId ? { ...c, weight: action.payload.weight } : c
            ),
          },
        },
      };
    }
    case 'UPDATE_EISENHOWER_TASK': {
      const eisenhower = state.modelData.eisenhower;
      if (!eisenhower) return state;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          eisenhower: {
            ...eisenhower,
            tasks: eisenhower.tasks.map(t =>
              t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
            ),
          },
        },
      };
    }
    case 'SET_CONSTRAINTS':
      return { ...updated, constraints: action.payload };
    case 'MERGE_WADM_CRITERIA': {
      const wadm = state.modelData.wadm;
      if (!wadm) return state;
      const { keepId, removeId, mergedName } = action.payload;
      const keepCriterion = wadm.criteria.find(c => c.id === keepId);
      if (!keepCriterion) return state;
      return {
        ...updated,
        modelData: {
          ...state.modelData,
          wadm: {
            ...wadm,
            criteria: wadm.criteria
              .map(c => c.id === keepId ? { ...c, name: mergedName } : c)
              .filter(c => c.id !== removeId),
            scores: Object.fromEntries(
              Object.entries(wadm.scores).map(([optId, scores]) => [
                optId,
                Object.fromEntries(
                  Object.entries(scores)
                    .filter(([cId]) => cId !== removeId)
                    .map(([cId, score]) => [
                      cId,
                      cId === keepId
                        ? (score + (scores[removeId] ?? score)) / 2
                        : score,
                    ])
                ),
              ])
            ),
          },
        },
      };
    }
    case 'CLEAR_MODEL_DATA':
      return { ...updated, modelData: {}, factors: undefined, constraints: undefined };
    case 'RESTORE_STATE':
      return action.payload;
    case 'RESET':
      return createInitialContext();
    default:
      return state;
  }
}

/* ===== Context ===== */
interface DecisionContextValue {
  state: DecisionContext;
  dispatch: React.Dispatch<Action>;
  apiConfig: ApiConfig;
  hasRestorableSession: boolean;
  sessionRestored: boolean;
  markSessionRestored: () => void;
}

const DecisionContextObj = createContext<DecisionContextValue | null>(null);

const STORAGE_KEY = 'decision_lens_state';
const SESSION_FLAG_KEY = 'decision_lens_session_flag';

/* ===== LocalStorage Capacity Check ===== */
export function checkLocalStorageCapacity(): { ok: boolean; usagePercent: number } {
  try {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += (localStorage.getItem(key)?.length ?? 0) + key.length;
      }
    }
    // Approximate 5MB limit (chars * 2 bytes for UTF-16)
    const bytesUsed = total * 2;
    const limit = 5 * 1024 * 1024;
    return { ok: bytesUsed < limit * 0.9, usagePercent: Math.round((bytesUsed / limit) * 100) };
  } catch {
    return { ok: false, usagePercent: 100 };
  }
}

export function exportStateAsJSON(): string {
  const state = localStorage.getItem(STORAGE_KEY);
  const analytics = localStorage.getItem('decision_lens_analytics');
  return JSON.stringify({ state: state ? JSON.parse(state) : null, analytics: analytics ? JSON.parse(analytics) : null, exportedAt: Date.now() }, null, 2);
}

export function hasRestorableSession(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved) as DecisionContext;
    // A session is restorable if user has progressed beyond stage 1 or has input
    return parsed.currentStage > 1 || (parsed.rawInput?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Always start at stage 1 on fresh load; user will be prompted to restore
        return { ...parsed, currentStage: 1 };
      }
    } catch { /* ignore */ }
    return createInitialContext();
  });

  const [sessionRestored, setSessionRestored] = useReducer(
    (_: boolean, action: boolean) => action,
    false
  );

  const markSessionRestored = () => setSessionRestored(true);

  // Auto-save state to LocalStorage with capacity check
  const prevStageRef = useRef(state.currentStage);
  useEffect(() => {
    const { ok } = checkLocalStorageCapacity();
    if (!ok) {
      // Dispatch a custom event that App.tsx can listen for
      window.dispatchEvent(new CustomEvent('dl-storage-warning'));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Set session flag for restore detection
    if (state.currentStage > 1 || state.rawInput.length > 0) {
      localStorage.setItem(SESSION_FLAG_KEY, 'true');
    }
    prevStageRef.current = state.currentStage;
  }, [state]);

  const restorable = hasRestorableSession() && !sessionRestored;

  return (
    <DecisionContextObj.Provider value={{ state, dispatch, apiConfig: API_CONFIG, hasRestorableSession: restorable, sessionRestored, markSessionRestored }}>
      {children}
    </DecisionContextObj.Provider>
  );
}

export function useDecision() {
  const ctx = useContext(DecisionContextObj);
  if (!ctx) throw new Error('useDecision must be used within DecisionProvider');
  return ctx;
}
