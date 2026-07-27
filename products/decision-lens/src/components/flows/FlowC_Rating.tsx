import { useState } from 'react';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useDecision } from '../../store/DecisionContext';
import { trackEvent } from '../../services/analytics';
import type { EisenhowerTask } from '../../types';

export default function FlowC_Rating() {
  const { state, dispatch } = useDecision();

  const [tasks, setTasks] = useState<EisenhowerTask[]>(() => {
    if (state.tasks && state.tasks.length > 0) {
      return state.tasks.map((t, i) => ({
        id: uuidv4(),
        text: t.text,
        urgency: t.urgency,
        importance: t.importance,
        order: i,
        isHardDeadline: false,
      }));
    }
    if (state.modelData.eisenhower) {
      return state.modelData.eisenhower.tasks;
    }
    return [];
  });
  const [newTask, setNewTask] = useState('');

  const hardConstraints = state.constraints?.hard ?? [];
  const softConstraints = state.constraints?.soft ?? [];

  const addTask = () => {
    if (newTask.trim()) {
      setTasks(prev => [...prev, {
        id: uuidv4(),
        text: newTask.trim(),
        urgency: 5,
        importance: 5,
        order: prev.length,
        isHardDeadline: false,
      }]);
      setNewTask('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, updates: Partial<EisenhowerTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const getQuadrantLabel = (urgency: number, importance: number) => {
    if (urgency >= 6 && importance >= 6) return { text: '立即去做', color: 'text-red-600 bg-red-50' };
    if (urgency < 6 && importance >= 6) return { text: '安排日程', color: 'text-teal-600 bg-teal-50' };
    if (urgency >= 6 && importance < 6) return { text: '委托他人', color: 'text-amber-600 bg-amber-50' };
    return { text: '果断放弃', color: 'text-gray-500 bg-gray-50' };
  };

  const handleConfirm = () => {
    const ordered = tasks.map((t, i) => ({ ...t, order: i }));

    dispatch({
      type: 'SET_EISENHOWER_DATA',
      payload: { tasks: ordered },
    });

    dispatch({
      type: 'SET_FLOW_STEP',
      payload: 1,
    });

    dispatch({ type: 'SET_STAGE', payload: 3 });

    trackEvent('stage_completed', { stage: 2, flow: 'priority', step: 0 });
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
        </div>
      )}

      {/* Task Rating */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 text-center mb-1">任务评级</h3>
        <p className="text-sm text-gray-500 text-center mb-2">调整每个任务的紧急度和重要度，系统会自动分配到四象限</p>
        <p className="text-xs text-gray-500 text-center mb-6">
          <span className="inline-flex items-center gap-1">🔒 硬性截止日</span>
          <span className="mx-2">=</span>
          <span>客观不可更改的时间点（如考试、航班）；</span>
          <span className="inline-flex items-center gap-1 ml-2">🔓 弹性时间</span>
          <span className="mx-2">=</span>
          <span>主观期望，可以协商调整</span>
        </p>

        <div className="space-y-3">
          {tasks.map(task => {
            const q = getQuadrantLabel(task.urgency, task.importance);
            return (
              <div key={task.id} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-gray-700 font-medium">{task.text}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.color}`}>{q.text}</span>
                  <button onClick={() => removeTask(task.id)} className="text-gray-300 hover:text-red-400 text-xs">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">紧急</span>
                    <input
                      type="range" min={1} max={10} step={1} value={task.urgency}
                      onChange={e => updateTask(task.id, { urgency: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono text-gray-500 w-4">{task.urgency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">重要</span>
                    <input
                      type="range" min={1} max={10} step={1} value={task.importance}
                      onChange={e => updateTask(task.id, { importance: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono text-gray-500 w-4">{task.importance}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-xs text-gray-500">截止时间性质</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTask(task.id, { isHardDeadline: false })}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        !task.isHardDeadline
                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >🔓 弹性时间</button>
                    <button
                      onClick={() => updateTask(task.id, { isHardDeadline: true })}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        task.isHardDeadline
                          ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >🔒 硬性截止日</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Task */}
        <div className="mt-4 flex gap-2">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
            placeholder="添加一个待办任务..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button
            onClick={addTask}
            className="px-4 py-2 text-sm rounded-lg bg-[#0F766E] text-white hover:bg-[#0D6B63] disabled:opacity-40"
            disabled={!newTask.trim()}
          >添加</button>
        </div>
      </div>

      {/* Confirm */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleConfirm}
          disabled={tasks.length === 0}
          className="px-8 py-3 rounded-2xl bg-[#0F766E] text-white font-semibold hover:bg-[#0D6B63] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-600/20"
        >
          确认评级，进入四象限
        </button>
      </div>
    </motion.div>
  );
}
