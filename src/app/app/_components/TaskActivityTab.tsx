"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Clock, Loader2, History, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityUser = {
  id: string;
  name: string;
} | null;

type ActivityLog = {
  id: string;
  task_id: string;
  action_type: "Create" | "Update" | "StatusChange" | "Comment" | "Other";
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user: ActivityUser;
};

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

interface TaskActivityTabProps {
  taskId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ToDo: "To Do",
  InProgress: "In Progress",
  InReview: "In Review",
  Done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Urgent: "Urgent",
};

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  assignee: "assignee",
  assignee_id: "assignee",
  priority: "priority",
  due_date: "due date",
  status: "status",
  comment_created: "comment",
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/** Format a value for display — handles null, priority labels, status labels, dates */
function formatValue(value: string | null, field: string | null): string {
  if (value === null || value === "null") return "none";
  if (field === "status") return STATUS_LABELS[value] || value;
  if (field === "priority") return PRIORITY_LABELS[value] || value;
  if (field === "due_date") {
    try {
      return new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return escapeHtml(value);
    }
  }
  // Truncate long values for display
  const escaped = escapeHtml(value);
  return escaped.length > 80 ? escaped.slice(0, 80) + "…" : escaped;
}

/** Format timestamp for inline display: "15/04/2026 10:30" */
function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative timestamp for the sub-line */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

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

// ─── Action type → color mapping for timeline dot ─────────────────────────────
const DOT_COLORS: Record<string, string> = {
  Create: "bg-emerald-500",
  StatusChange: "bg-blue-500",
  Update: "bg-amber-500",
  Comment: "bg-purple-500",
  Other: "bg-zinc-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskActivityTab({ taskId }: TaskActivityTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch a page of activity logs
  const fetchActivity = useCallback(
    async (page: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const res = await apiFetch(
          `/api/tasks/${taskId}/activity?page=${page}&limit=20`
        );
        const body = await res.json();

        if (!body.success) {
          setError(body.error || "Có lỗi xảy ra");
          return;
        }

        if (append) {
          setLogs((prev) => [...prev, ...body.data]);
        } else {
          setLogs(body.data);
        }
        setPagination(body.pagination);
      } catch {
        setError("Không thể tải lịch sử hoạt động");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [taskId]
  );

  // Initial load
  useEffect(() => {
    setLogs([]);
    setPagination(null);
    fetchActivity(1);
  }, [fetchActivity]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination?.hasMore &&
          !loadingMore &&
          !loading
        ) {
          fetchActivity(pagination.page + 1, true);
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pagination, loadingMore, loading, fetchActivity]);

  // ─── Render action text ───────────────────────────────────────────────────
  // Format: "Created by [Name] at [timestamp]"
  //         "[Name] changed status from X → Y at [timestamp]"
  //         "[Name] updated [field]: old → new at [timestamp]"
  //         "[Name] commented on task at [timestamp]"
  const renderActionText = (log: ActivityLog) => {
    const userName = log.user?.name ?? "System";
    const timestamp = (
      <span className="text-zinc-400 font-normal">
        {" "}at {formatTimestamp(log.created_at)}
      </span>
    );

    switch (log.action_type) {
      case "Create":
        return (
          <>
            Created by{" "}
            <span className="font-semibold text-zinc-900">{userName}</span>
            {timestamp}
          </>
        );

      case "StatusChange":
        return (
          <>
            <span className="font-semibold text-zinc-900">{userName}</span>{" "}
            changed status from{" "}
            <span className="font-medium text-zinc-500">
              {formatValue(log.old_value, "status")}
            </span>{" "}
            →{" "}
            <span className="font-medium text-zinc-900">
              {formatValue(log.new_value, "status")}
            </span>
            {timestamp}
          </>
        );

      case "Update": {
        const field = FIELD_LABELS[log.field_changed || ""] || log.field_changed || "task";
        return (
          <>
            <span className="font-semibold text-zinc-900">{userName}</span>{" "}
            updated {field}:{" "}
            <span className="text-zinc-500 line-through">
              {formatValue(log.old_value, log.field_changed)}
            </span>{" "}
            →{" "}
            <span className="text-zinc-900">
              {formatValue(log.new_value, log.field_changed)}
            </span>
            {timestamp}
          </>
        );
      }

      case "Comment":
        return (
          <>
            <span className="font-semibold text-zinc-900">{userName}</span>{" "}
            commented on task
            {timestamp}
          </>
        );

      default:
        return (
          <>
            <span className="font-semibold text-zinc-900">{userName}</span>{" "}
            made a change
            {log.field_changed && (
              <span className="text-zinc-500"> to {log.field_changed}</span>
            )}
            {timestamp}
          </>
        );
    }
  };

  // ─── Skeleton loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 py-2 animate-pulse" data-testid="activity-skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-zinc-200 rounded w-3/4" />
              <div className="h-3 bg-zinc-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="activity-empty">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
          <History className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500 font-medium">No activity yet</p>
        <p className="text-xs text-zinc-400 mt-1">
          Changes and updates will appear here
        </p>
      </div>
    );
  }

  // ─── Timeline UI ──────────────────────────────────────────────────────────
  return (
    <div ref={scrollRef} className="relative">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-zinc-200" />

      <div className="space-y-0">
        {logs.map((log, idx) => (
          <div
            key={log.id}
            className="relative flex items-start gap-3 pl-0 py-3 group"
            data-testid="activity-item"
          >
            {/* Timeline dot */}
            <div className="relative z-10 shrink-0">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center shadow-sm group-hover:border-zinc-300 transition-colors">
                {log.user ? (
                  <span className="text-[9px] font-bold text-zinc-600">
                    {getInitials(log.user.name)}
                  </span>
                ) : (
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
              {/* Colored indicator dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  DOT_COLORS[log.action_type] || DOT_COLORS.Other
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[13px] text-zinc-600 leading-relaxed">
                {renderActionText(log)}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {timeAgo(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-3 gap-2 text-zinc-400" data-testid="activity-loading-more">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading more...</span>
        </div>
      )}

      {/* End of list */}
      {pagination && !pagination.hasMore && logs.length > 0 && (
        <p className="text-center text-[11px] text-zinc-300 py-2 select-none">
          — End —
        </p>
      )}
    </div>
  );
}
