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
          ? "bg-emerald-50/60 border-emerald-400 ring-4 ring-emerald-400/10 scale-[1.01] z-20 shadow-lg" 
          : "bg-transparent border-transparent focus-within:border-emerald-200 focus-within:bg-emerald-50/20"
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 px-2">
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

      {/* Drop zone container */}
      <div
        className={`flex-1 flex flex-col space-y-3 min-h-[300px] rounded-xl transition-colors ${
          isOverColumn ? "" : "bg-zinc-50/50"
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
                ? "border-emerald-300 bg-emerald-100/20 scale-[1.02] shadow-sm"
                : "border-zinc-200 bg-white/50"
            }`}
          >
            {isDragActive ? (
              <p className="text-xs font-medium text-emerald-600 animate-pulse">
                Thả task vào đây
              </p>
            ) : (
              <div className="flex flex-col items-center text-center px-4">
                <p className="text-[11px] font-medium text-zinc-400">
                  Chưa có task nào
                </p>
                {onAddTask && (
                  <p className="text-[10px] text-zinc-300 mt-1">
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
            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg border border-dashed border-transparent hover:border-zinc-200 transition-all mt-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm task
          </button>
        )}
      </div>
    </div>
  );
}
