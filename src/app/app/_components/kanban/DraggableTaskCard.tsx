"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown } from "lucide-react";
import { TaskCard, type TaskItem } from "../TaskCard";
import type { TaskStatus } from "./KanbanColumn";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "ToDo", label: "To Do" },
  { value: "InProgress", label: "In Progress" },
  { value: "InReview", label: "In Review" },
  { value: "Done", label: "Done" },
];

interface DraggableTaskCardProps {
  task: TaskItem;
  canDrag: boolean;
  isDragActive: boolean;
  onClick: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  currentUserRole: string;
  currentUserId: string;
}

export function DraggableTaskCard({
  task,
  canDrag,
  isDragActive,
  onClick,
  onStatusChange,
  currentUserRole,
  currentUserId,
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: !canDrag,
      data: { task },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 999,
      }
    : undefined;

  const isManagerOrAdmin =
    currentUserRole === "Manager" || currentUserRole === "Admin";
  const canChangeStatus =
    isManagerOrAdmin || task.assignee_id === currentUserId || task.creator.id === currentUserId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={`group relative transition-all duration-150 ${canDrag ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-zinc-300 rounded-xl" : ""} ${
        isDragging
          ? "opacity-50 scale-[1.02] shadow-2xl ring-2 ring-blue-400/60 rounded-xl z-50"
          : ""
      }`}
    >
      {/* Permission tooltip khi không có quyền */}
      {!canDrag && (
        <div 
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl group/tooltip"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20">
            Chỉ assignee hoặc Manager mới có thể đổi trạng thái
          </div>
        </div>
      )}

      {/* Task card (click mở detail panel) */}
      <div className="pointer-events-auto">
        <TaskCard task={task} onClick={onClick} />
      </div>

      {/* Mobile dropdown fallback — chỉ hiện trên small screens, ẩn trên md+ */}
      {canChangeStatus && (
        <div className="md:hidden mt-1 px-1 pb-1">
          <div className="relative">
            <select
              value={task.status}
              onChange={(e) =>
                onStatusChange(task.id, e.target.value as TaskStatus)
              }
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-2 pr-7 py-1.5 text-xs border border-zinc-200 rounded-lg outline-none appearance-none bg-white focus:ring-2 focus:ring-zinc-200"
              aria-label={`Đổi trạng thái task: ${task.title}`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}
