"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn, type TaskStatus } from "./KanbanColumn";
import { TaskCard, type TaskItem } from "../TaskCard";

const STATUS_COLUMNS: {
  id: TaskStatus;
  label: string;
  dotColor: string;
}[] = [
  { id: "ToDo",       label: "To Do",      dotColor: "bg-zinc-400" },
  { id: "InProgress", label: "In Progress", dotColor: "bg-blue-400" },
  { id: "InReview",   label: "In Review",   dotColor: "bg-purple-400" },
  { id: "Done",       label: "Done",        dotColor: "bg-emerald-400" },
];

export interface SharedKanbanBoardProps {
  tasks: TaskItem[];
  currentUserId: string;
  currentUserRole: string;
  isLoading: boolean;
  canMutate?: boolean; // Tắt nút cộng nếu không có quyền chung (như bị archived)
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function SharedKanbanBoard({
  tasks,
  currentUserId,
  currentUserRole,
  isLoading,
  canMutate,
  onTaskClick,
  onStatusChange,
  onAddTask,
  onDragStateChange,
}: SharedKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    onDragStateChange?.(true);
    const task = event.active.data.current?.task as TaskItem | undefined;
    if (task) setActiveTask(task);
  }, [onDragStateChange]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onDragStateChange?.(false);
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const targetStatus = over.id as TaskStatus;

      const validStatuses: TaskStatus[] = ["ToDo", "InProgress", "InReview", "Done"];
      if (!validStatuses.includes(targetStatus)) return;

      onStatusChange(taskId, targetStatus);
    },
    [onStatusChange, onDragStateChange]
  );

  const handleDragCancel = useCallback(() => {
    onDragStateChange?.(false);
    setActiveTask(null);
  }, [onDragStateChange]);

  const isManagerOrAdmin = currentUserRole === "Manager" || currentUserRole === "Admin";
  const canShowAdd = canMutate !== undefined ? canMutate : true; // Default to true for Manager/Member (FR-04)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-24">
        {STATUS_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              dotColor={col.dotColor}
              tasks={columnTasks}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
              onAddTask={canShowAdd && onAddTask ? () => onAddTask(col.id) : undefined}
              isLoading={isLoading}
              isDragActive={!!activeTask}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-2 scale-105 shadow-2xl ring-2 ring-blue-400/60 rounded-xl opacity-95">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
