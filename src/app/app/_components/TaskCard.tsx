"use client";

import { CalendarDays, AlertCircle, User } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: "ToDo" | "InProgress" | "InReview" | "Done";
  priority: "Low" | "Medium" | "High" | "Urgent";
  due_date: string | null;
  assignee: { id: string | null; name: string; email: string | null } | null;
  creator: { id: string; name: string; email: string };
  project?: { id: string; name: string; color: string };
  created_at: string;
};

interface TaskCardProps {
  task: TaskItem;
  onClick?: (task: TaskItem) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  Low:    "text-sky-600 bg-sky-50 border-sky-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  High:   "text-orange-600 bg-orange-50 border-orange-200",
  Urgent: "text-red-600 bg-red-50 border-red-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  Low:    "Low",
  Medium: "Medium",
  High:   "High",
  Urgent: "Urgent",
};

const STATUS_STYLES: Record<string, string> = {
  ToDo:       "text-zinc-600 bg-zinc-100",
  InProgress: "text-blue-600 bg-blue-50",
  InReview:   "text-purple-600 bg-purple-50",
  Done:       "text-emerald-600 bg-emerald-50",
};

const STATUS_LABELS: Record<string, string> = {
  ToDo:       "To Do",
  InProgress: "In Progress",
  InReview:   "In Review",
  Done:       "Done",
};

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = isOverdue(task.due_date) && task.status !== "Done";

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className="group w-full text-left bg-white rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
    >
      <div className="p-4">
        {/* Project color bar (when shown without project context) */}
        {task.project && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: task.project.color }}
            />
            <span className="text-xs text-zinc-400 truncate">{task.project.name}</span>
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-zinc-900 leading-snug group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
          {task.title}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status */}
          <span
            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>

          {/* Priority */}
          <span
            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[task.priority]}`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>

          {/* Overdue badge — PRD 10.1 */}
          {overdue && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" />
              Overdue
            </span>
          )}
        </div>

        {/* Footer: assignee + due date */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
          {/* Assignee */}
          <div className="flex items-center gap-1.5 min-w-0">
            {task.assignee && task.assignee.id ? (
              <>
                <div
                  className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  title={task.assignee.name}
                >
                  {getInitials(task.assignee.name)}
                </div>
                <span className="text-xs text-zinc-500 truncate">{task.assignee.name}</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400 italic">
                <User className="w-3 h-3" />
                {task.assignee?.name === "[Removed User]"
                  ? "[Removed User]"
                  : "Chưa assign"}
              </span>
            )}
          </div>

          {/* Due date */}
          {task.due_date && (
            <div
              className={`flex items-center gap-1 text-xs shrink-0 ${
                overdue ? "text-red-600 font-semibold" : "text-zinc-400"
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              {formatDate(task.due_date)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
