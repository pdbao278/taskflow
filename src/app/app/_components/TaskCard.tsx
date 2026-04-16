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
  assignee_id: string | null;
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
  Low:    "text-[var(--tf-info)] bg-[var(--tf-info-muted)] border-[var(--tf-info-muted)]",
  Medium: "text-[var(--tf-warning)] bg-[var(--tf-warning-muted)] border-[var(--tf-warning-muted)]",
  High:   "text-[var(--tf-priority-high)] bg-[var(--tf-priority-high)]/10 border-[var(--tf-priority-high)]/20",
  Urgent: "text-[var(--tf-error)] bg-[var(--tf-error-muted)] border-[var(--tf-error-muted)]",
};

const PRIORITY_LABELS: Record<string, string> = {
  Low:    "Low",
  Medium: "Medium",
  High:   "High",
  Urgent: "Urgent",
};

const STATUS_STYLES: Record<string, string> = {
  ToDo:       "text-[var(--tf-text-sub)] bg-[var(--tf-bg-subtle)]",
  InProgress: "text-[var(--tf-status-inprogress)] bg-[var(--tf-status-inprogress)]/10",
  InReview:   "text-[var(--tf-status-inreview)] bg-[var(--tf-status-inreview)]/10",
  Done:       "text-[var(--tf-success)] bg-[var(--tf-success-muted)]",
};

const STATUS_LABELS: Record<string, string> = {
  ToDo:       "To Do",
  InProgress: "In Progress",
  InReview:   "In Review",
  Done:       "Done",
};

// Priority border map for the left accent edge
const PRIORITY_BORDER: Record<string, string> = {
  Low:    "var(--tf-info)",
  Medium: "var(--tf-warning)",
  High:   "var(--tf-priority-high)",
  Urgent: "var(--tf-error)",
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
      className="group w-full text-left relative overflow-hidden bg-[var(--tf-bg-card)] rounded-[var(--tf-radius-lg)] border border-[var(--tf-border)] hover:border-[var(--tf-border-hover)] hover:shadow-card-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-accent)]"
      style={{
        boxShadow: "var(--tf-shadow-sm)"
      }}
    >
      {/* Accent edge based on Priority */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: PRIORITY_BORDER[task.priority] }}
      />

      <div className="p-4">
        {/* Project Context (if available) */}
        {task.project && (
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: task.project.color }}
            />
            <span className="text-[11px] font-bold text-[var(--tf-text-sub)] tracking-wide uppercase">
              {task.project.name}
            </span>
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-[var(--tf-text)] leading-snug group-hover:text-[var(--tf-accent)] transition-colors mb-4 line-clamp-2">
          {task.title}
        </p>

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          <span
            className={`tf-badge ${STATUS_STYLES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>

          {/* Priority Badge */}
          <span
            className={`tf-badge border ${PRIORITY_STYLES[task.priority]}`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>

          {/* Overdue Badge */}
          {overdue && (
            <span className="tf-badge bg-[var(--tf-error)] text-white shadow-sm shadow-[var(--tf-error-muted)]/50">
              <AlertCircle className="w-2.5 h-2.5" />
              Overdue
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[var(--tf-border-subtle)] flex items-center justify-between gap-2">
          {/* Assignee */}
          <div className="flex items-center gap-2 min-w-0">
            {task.assignee && task.assignee.id ? (
              <>
                <div
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-500/10 flex items-center justify-center text-[10px] font-extrabold text-indigo-600 shrink-0 shadow-sm"
                  title={task.assignee.name}
                >
                  {getInitials(task.assignee.name)}
                </div>
                <span className="text-xs font-medium text-[var(--tf-text-sub)] truncate">{task.assignee.name}</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--tf-text-muted)] italic">
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
              className={`flex items-center gap-1.5 text-[11px] shrink-0 px-2 py-1 rounded-md ${
                overdue ? "bg-[var(--tf-error-muted)] text-[var(--tf-error)] font-bold" : "bg-[var(--tf-bg-subtle)] text-[var(--tf-text-sub)] font-medium"
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
