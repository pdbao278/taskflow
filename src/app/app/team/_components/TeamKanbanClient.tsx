"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";

import { SharedKanbanBoard } from "../../_components/kanban/SharedKanbanBoard";
import { apiFetch } from "@/lib/apiFetch";
import { TaskCard, type TaskItem } from "../../_components/TaskCard";
import { TaskDetailPanel } from "../../_components/TaskDetailPanel";
import { TaskFormPanel } from "../../_components/TaskFormPanel";
import type { TaskStatus } from "../../_components/kanban/KanbanColumn";
import {
  Plus,
  RefreshCcw,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Toast types ──────────────────────────────────────────────────────────────

type Toast = {
  id: number;
  msg: string;
  type: "success" | "error";
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamKanbanClientProps {
  currentUserRole: string;
  currentUserId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamKanbanClient({
  currentUserRole,
  currentUserId,
}: TeamKanbanClientProps) {
  const queryClient = useQueryClient();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const isDragActiveRef = useRef(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const isManagerOrAdmin =
    currentUserRole === "Manager" || currentUserRole === "Admin";

  // ─── Toast helpers ─────────────────────────────────────────────────────────

  const addToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000
    );
  }, []);

  // ─── Debounce search 300ms ─────────────────────────────────────────────────
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    try {
      const [projRes, membersRes] = await Promise.all([
        apiFetch("/api/projects").then((r) => r.json()),
        apiFetch("/api/workspaces/members").then((r) => r.json()),
      ]);
      if (projRes.success) setProjects(projRes.data);
      if (membersRes.success) setMembers(membersRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const fetchTeamTasks = async () => {
    const params = new URLSearchParams();
    if (projectId) params.append("project_id", projectId);
    if (assigneeId) params.append("assignee_id", assigneeId);
    if (priority) params.append("priority", priority);
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (dueFrom) params.append("due_from", dueFrom);
    if (dueTo) params.append("due_to", dueTo);

    const res = await apiFetch(`/api/tasks/team?${params.toString()}`);
    // Handle Forbidden (403) silently mostly or let react-query fail
    if (res.status === 403) throw new Error("Chỉ Quản lý mới có quyền xem Dashboard Team");
    
    const body = await res.json();
    if (!body.success) throw new Error(body.error || "Failed to fetch tasks");

    const columns = body.data?.columns;
    const flattenedTasks: TaskItem[] = [];
    if (columns) {
      flattenedTasks.push(...(columns["To Do"] || []));
      flattenedTasks.push(...(columns["In Progress"] || []));
      flattenedTasks.push(...(columns["In Review"] || []));
      flattenedTasks.push(...(columns["Done"] || []));
    }
    return flattenedTasks;
  };

  const queryKey = ["team-tasks", projectId, assigneeId, priority, debouncedSearch, dueFrom, dueTo];

  const { data: tasks = [], isLoading, isFetching, refetch, isError, error } = useQuery({
    queryKey,
    queryFn: fetchTeamTasks,
    refetchInterval: () => {
      return isDragActiveRef.current ? false : 5000;
    },
  });

  const showLoading = useLoadingDelay(isLoading);


  // ─── Status change với optimistic UI ──────────────────────────────────────

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      const canChange = isManagerOrAdmin || task.assignee_id === currentUserId || task.creator?.id === currentUserId;
      if (!canChange) {
        addToast("Chỉ assignee hoặc Manager mới có thể đổi trạng thái", "error");
        return;
      }

      // Snapshot
      const previousTasks = queryClient.getQueryData<TaskItem[]>(queryKey);

      // Optimistic upate
      queryClient.setQueryData(queryKey, (old: TaskItem[] | undefined) => {
        if (!old) return [];
        return old.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      });

      try {
        const res = await apiFetch(`/api/tasks/${taskId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const body = await res.json();

        if (!body.success) {
          queryClient.setQueryData(queryKey, previousTasks);
          addToast(body.error || "Có lỗi xảy ra. Thử lại?", "error");
        } else {
          addToast("Đã cập nhật trạng thái");
        }
      } catch {
        queryClient.setQueryData(queryKey, previousTasks);
        addToast("Có lỗi xảy ra. Thử lại?", "error");
      } finally {
        queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
      }
    },
    [tasks, isManagerOrAdmin, currentUserId, addToast, queryClient, queryKey]
  );

  // ─── Task CRUD callbacks ───────────────────────────────────────────────────

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
  };

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
  };

  const handleTaskDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ["team-tasks"] });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-red-50 border border-red-200 p-8">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <h3 className="text-red-900 font-semibold text-lg">Không thể truy cập dữ liệu</h3>
        <p className="text-sm text-red-700 mt-1">{error instanceof Error ? error.message : "Đã có lỗi xảy ra."}</p>
      </div>
    );
  }

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          {/* Project filter */}
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
          >
            <option value="">Dự án: Tất cả</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
          >
            <option value="">Assignee: Tất cả</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
          >
            <option value="">Ưu tiên: Tất cả</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Due date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
              title="Từ ngày"
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white w-32"
            />
            <span className="text-zinc-400">-</span>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              title="Đến ngày"
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white w-32"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            aria-label="Làm mới danh sách task"
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Add task button — Admin/Manager/Member can create tasks (PRD FR-04) */}
        <button
          id="btn-team-add-task"
          onClick={() => {
            setDefaultStatus(undefined);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors w-full lg:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Thêm Task
        </button>
      </div>

      <SharedKanbanBoard
        tasks={tasks}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isLoading={showLoading}

        onTaskClick={(t) => setSelectedTaskId(t.id)}
        onStatusChange={handleStatusChange}
        onAddTask={(status) => {
          setDefaultStatus(status);
          setCreateOpen(true);
        }}
        onDragStateChange={(isDragging) => {
          isDragActiveRef.current = isDragging;
        }}
      />

      {/* Panels */}
      <TaskFormPanel
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setDefaultStatus(undefined);
        }}
        onCreated={handleTaskCreated}
        defaultStatus={defaultStatus}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />

      {/* Toast notifications */}
      <div
        aria-live="polite"
        aria-label="Thông báo"
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              t.type === "success"
                ? "bg-white border-emerald-200 text-emerald-700"
                : "bg-white border-red-200 text-red-600"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}
