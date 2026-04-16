"use client";

import { useDroppable } from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { TaskItem } from "../TaskCard";
import { DraggableTaskCard } from "./DraggableTaskCard";
import { TaskCardSkeleton } from "@/app/components/SkeletonLoaders";

export type TaskStatus = "ToDo" | "InProgress" | "InReview" | "Done";

export interface KanbanColumnProps {
  id: TaskStatus;
  label: string;
  dotColor: string;
  tasks: TaskItem[];
  currentUserId: string;
  currentUserRole: string;
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: () => void;
  isLoading: boolean;
  isDragActive: boolean;
  isOverColumn?: boolean;
}

export function KanbanColumn({
  id,
  label,
  dotColor,
  tasks,
  currentUserId,
  currentUserRole,
  onTaskClick,
  onStatusChange,
  onAddTask,
  isLoading,
  isDragActive,
  isOverColumn,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  const isManagerOrAdmin =
    currentUserRole === "Manager" || currentUserRole === "Admin";

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col min-h-[400px] rounded-2xl p-2 transition-all duration-300 border-2 ${
        isOverColumn 
          ? "bg-[var(--tf-accent-subtle)] border-[var(--tf-accent)] ring-4 ring-[var(--tf-accent-muted)] scale-[1.01] z-20 shadow-lg" 
          : "bg-transparent border-transparent focus-within:border-[var(--tf-border)] focus-within:bg-[var(--tf-bg-subtle)]"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: dotColor }} />
          <h3 className="text-[11px] font-extrabold text-[var(--tf-text-sub)] uppercase tracking-[0.1em]">
            {label}
          </h3>
          <span className="text-[10px] font-bold text-[var(--tf-text-sub)] bg-[var(--tf-border)] px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Drop zone container */}
      <div
        className={`flex-1 flex flex-col space-y-3 min-h-[300px] rounded-xl transition-colors ${
          isOverColumn ? "" : "bg-[var(--tf-bg-subtle)] bg-opacity-50"
        }`}
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))
        ) : tasks.length > 0 ? (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => {
              const canChangeStatus =
                isManagerOrAdmin || task.assignee_id === currentUserId || task.creator.id === currentUserId;
              return (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  canDrag={canChangeStatus && !isLoading}
                  isDragActive={isDragActive}
                  onClick={() => onTaskClick(task)}
                  onStatusChange={onStatusChange}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                />
              );
            })}
          </SortableContext>
        ) : (
          /* Empty state */
          <div
            className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl transition-all duration-200 ${
              isOverColumn
                ? "border-[var(--tf-accent)] bg-[var(--tf-accent-subtle)] scale-[1.02] shadow-sm"
                : "border-[var(--tf-border)] bg-[var(--tf-bg-card)]"
            }`}
          >
            {isDragActive ? (
              <p className="text-xs font-medium text-[var(--tf-accent)] tf-animate-pulse-soft">
                Thả task vào đây
              </p>
            ) : (
              <div className="flex flex-col items-center text-center px-4">
                <p className="text-[11px] font-medium text-[var(--tf-text-muted)]">
                  Chưa có task nào
                </p>
                {onAddTask && (
                  <p className="text-[10px] text-[var(--tf-text-dim)] mt-1">
                    Nhấn nút bên dưới để thêm
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add task button (Manager/Admin/Member) */}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-[var(--tf-text-muted)] hover:text-[var(--tf-accent)] hover:bg-[var(--tf-bg-card)] rounded-lg border border-dashed border-transparent hover:border-[var(--tf-accent-muted)] transition-all mt-auto"
          >
            <Plus className="w-4 h-4" />
            Thêm task
          </button>
        )}
      </div>
    </div>
  );
}
