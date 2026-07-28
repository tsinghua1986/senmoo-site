import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDecision } from '../../store/DecisionContext';
import type { EisenhowerTask } from '../../types';

type Quadrant = 'do' | 'schedule' | 'delegate' | 'drop';

function getQuadrant(task: EisenhowerTask): Quadrant {
  if (task.urgency >= 6 && task.importance >= 6) return 'do';
  if (task.urgency < 6 && task.importance >= 6) return 'schedule';
  if (task.urgency >= 6 && task.importance < 6) return 'delegate';
  return 'drop';
}

// Target values for each quadrant when dragging between quadrants
const QUADRANT_TARGET: Record<Quadrant, { urgency: number; importance: number }> = {
  do: { urgency: 8, importance: 8 },
  schedule: { urgency: 3, importance: 8 },
  delegate: { urgency: 8, importance: 3 },
  drop: { urgency: 3, importance: 3 },
};

const QUADRANT_CONFIG: Record<Quadrant, { label: string; color: string; bg: string; border: string }> = {
  do: { label: '立即去做', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  schedule: { label: '安排日程', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  delegate: { label: '委托他人', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  drop: { label: '果断放弃', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
};

function SortableTaskCard({ task, onUpdate, onDelete }: { task: EisenhowerTask; onUpdate: (updates: Partial<EisenhowerTask>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const urgencyPercent = ((task.urgency - 1) / 9) * 100;
  const importancePercent = ((task.importance - 1) / 9) * 100;

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 space-y-2 ${isDragging ? 'shadow-lg scale-105 z-50' : ''}`}
    >
      {/* Drag handle + delete */}
      <div className="flex items-center justify-between">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex items-center gap-1 text-xs select-none"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
          <span className="text-gray-400 text-xs">拖拽排序</span>
        </div>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 text-xs px-1"
          title="删除此任务"
        >&times;</button>
      </div>
      <p className="text-sm text-gray-700 font-medium">{task.text}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">紧急</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={task.urgency}
            onChange={e => onUpdate({ urgency: parseInt(e.target.value) })}
            style={{ '--value-percent': `${urgencyPercent}%` } as React.CSSProperties}
            className="flex-1"
          />
          <span className="text-xs font-mono text-gray-500 w-4">{task.urgency}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-8">重要</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={task.importance}
            onChange={e => onUpdate({ importance: parseInt(e.target.value) })}
            style={{ '--value-percent': `${importancePercent}%` } as React.CSSProperties}
            className="flex-1"
          />
          <span className="text-xs font-mono text-gray-500 w-4">{task.importance}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function EisenhowerMatrix() {
  const { state, dispatch } = useDecision();
  const eisenhower = state.modelData.eisenhower;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (!eisenhower) return null;

  const quadrants = useMemo(() => {
    const result: Record<Quadrant, EisenhowerTask[]> = { do: [], schedule: [], delegate: [], drop: [] };
    for (const task of eisenhower.tasks) {
      result[getQuadrant(task)].push(task);
    }
    // Sort by order within each quadrant
    for (const q of Object.keys(result) as Quadrant[]) {
      result[q].sort((a, b) => a.order - b.order);
    }
    return result;
  }, [eisenhower.tasks]);

  const updateTask = useCallback((id: string, updates: Partial<EisenhowerTask>) => {
    dispatch({ type: 'UPDATE_EISENHOWER_TASK', payload: { id, updates } });
  }, [dispatch]);

  // Handle drag end for intra-quadrant sorting AND inter-quadrant movement
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !eisenhower) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = eisenhower.tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const activeQuadrant = getQuadrant(activeTask);

    // Check if dropped on another task
    const overTask = eisenhower.tasks.find(t => t.id === overId);
    if (overTask) {
      const overQuadrant = getQuadrant(overTask);

      if (activeQuadrant === overQuadrant) {
        // Intra-quadrant reorder
        const tasksInQuadrant = quadrants[activeQuadrant];
        const oldIndex = tasksInQuadrant.findIndex(t => t.id === activeId);
        const newIndex = tasksInQuadrant.findIndex(t => t.id === overId);

        if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(tasksInQuadrant, oldIndex, newIndex);
          // Update order field for all tasks in this quadrant
          for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].order !== i) {
              dispatch({ type: 'UPDATE_EISENHOWER_TASK', payload: { id: reordered[i].id, updates: { order: i } } });
            }
          }
        }
      } else {
        // Inter-quadrant move: update urgency/importance to target quadrant values
        const target = QUADRANT_TARGET[overQuadrant];
        dispatch({
          type: 'UPDATE_EISENHOWER_TASK',
          payload: { id: activeId, updates: { urgency: target.urgency, importance: target.importance, order: 0 } },
        });
      }
    } else {
      // Dropped on a quadrant zone (not a task) - check if it's a different quadrant
      const zoneId = overId as string;
      const quadrantMap: Record<string, Quadrant> = {
        'quadrant-do': 'do',
        'quadrant-schedule': 'schedule',
        'quadrant-delegate': 'delegate',
        'quadrant-drop': 'drop',
      };
      const targetQuadrant = quadrantMap[zoneId];
      if (targetQuadrant && targetQuadrant !== activeQuadrant) {
        const target = QUADRANT_TARGET[targetQuadrant];
        dispatch({
          type: 'UPDATE_EISENHOWER_TASK',
          payload: { id: activeId, updates: { urgency: target.urgency, importance: target.importance, order: 0 } },
        });
      }
    }
  }, [eisenhower, quadrants, dispatch]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(QUADRANT_CONFIG) as Quadrant[]).map(q => {
            const config = QUADRANT_CONFIG[q];
            const tasks = quadrants[q];
            const taskIds = tasks.map(t => t.id);

            return (
              <motion.div
                layout
                key={q}
                id={`quadrant-${q}`}
                className={`rounded-xl border-2 p-4 min-h-[180px] ${config.bg} ${config.border}`}
              >
                <h4 className={`text-sm font-semibold mb-3 ${config.color}`}>
                  {config.label}
                  <span className="ml-2 text-xs opacity-60">({tasks.length})</span>
                </h4>
                <div className="space-y-2">
                  <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onUpdate={updates => updateTask(task.id, updates)}
                        onDelete={() => dispatch({ type: 'DELETE_EISENHOWER_TASK', payload: { id: task.id } })}
                      />
                    ))}
                  </SortableContext>
                  {tasks.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">暂无任务 — 可拖入此处</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
