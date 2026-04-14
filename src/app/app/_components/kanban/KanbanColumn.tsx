"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { TaskItem } from "../TaskCard";
import { DraggableTaskCard } from "./DraggableTaskCard";

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
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isManagerOrAdmin =
    currentUserRole === "Manager" || currentUserRole === "Admin";

  return (
    <div className="flex flex-col min-h-[400px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className="text-sm font-bold text-zinc-600 uppercase tracking-wider">
            {label}
          </h3>
          <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-2xl p-2 space-y-3 min-h-[300px] border transition-colors duration-150 ${
          isOver
            ? "bg-blue-50/70 border-blue-300 border-dashed"
            : "bg-zinc-50/50 border-zinc-200/50"
        }`}
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />
          ))
        ) : tasks.length > 0 ? (
          tasks.map((task) => {
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
          })
        ) : (
          /* Empty state */
          <div
            className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl transition-colors duration-150 ${
              isOver
                ? "border-blue-300 bg-blue-50/30"
                : "border-zinc-200"
            }`}
          >
            <p className="text-xs text-zinc-400">
              {isDragActive ? "Thả task vào đây" : "Không có task"}
            </p>
          </div>
        )}

        {/* Add task button (Manager/Admin/Member) */}
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg border border-dashed border-transparent hover:border-zinc-200 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm task
          </button>
        )}
      </div>
    </div>
  );
}
