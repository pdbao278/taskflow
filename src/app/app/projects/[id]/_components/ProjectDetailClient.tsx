"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { ProjectFormModal, type ProjectFormData } from "../../_components/ProjectFormModal";
import {
  ArrowLeft,
  Archive,
  Edit2,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Briefcase,
  Plus,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { TaskCard, type TaskItem } from "../../../_components/TaskCard";
import { TaskFormPanel } from "../../../_components/TaskFormPanel";
import { TaskDetailPanel } from "../../../_components/TaskDetailPanel";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  workspace_id: string;
  current_user_role: string;
  created_at: string;
};

type Toast = { id: number; type: "success" | "error"; message: string };

interface ProjectDetailClientProps {
  projectId: string;
  currentUserRole: string;
}

// ─── Status Constants ─────────────────────────────────────────────────────────

const STATUS_COLUMNS = [
  { id: "ToDo", label: "To Do", color: "bg-zinc-100" },
  { id: "InProgress", label: "In Progress", color: "bg-blue-50" },
  { id: "InReview", label: "In Review", color: "bg-purple-50" },
  { id: "Done", label: "Done", color: "bg-emerald-50" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            id="btn-confirm-archive"
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in { animation: scale-in 0.15s ease-out; }
      `}</style>
    </div>
  );
}

export function ProjectDetailClient({
  projectId,
  currentUserRole,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Task interaction states
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<"ToDo" | "InProgress" | "InReview" | "Done" | undefined>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const canMutate =
    currentUserRole === "Admin" || currentUserRole === "Manager";

  const addToast = useCallback(
    (type: "success" | "error", message: string) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    },
    []
  );

  const fetchProject = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const body = await res.json();
      if (body.success) {
        setProject(body.data);
      } else {
        setNotFound(true);
      }
    } catch {
      // apiFetch handles 401
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/tasks`);
      const body = await res.json();
      if (body.success) {
        setTasks(body.data);
      }
    } catch {
      // handled
    } finally {
      setTasksLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [fetchProject, fetchTasks]);

  const handleEdit = async (data: ProjectFormData) => {
    if (!project) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!body.success) {
        setEditError(body.error || "Có lỗi xảy ra");
        return;
      }
      setProject((prev) => prev ? { ...prev, ...body.data } : prev);
      setEditOpen(false);
      addToast("success", "Project đã được cập nhật");
    } catch {
      setEditError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setEditLoading(false);
    }
  };

  const handleArchive = async () => {
    setArchiveLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!body.success) {
        addToast("error", body.error || "Có lỗi xảy ra");
        return;
      }
      setProject((prev) =>
        prev ? { ...prev, archived_at: new Date().toISOString() } : prev
      );
      setArchiveConfirm(false);
      addToast("success", "Project đã được archive thành công");
    } catch {
      addToast("error", "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setArchiveLoading(false);
    }
  };

  // Task Handlers
  const handleTaskCreated = (newTask: any) => {
    setTasks((prev) => [newTask, ...prev]);
    setProject((prev) => prev ? { ...prev, total_tasks: prev.total_tasks + 1 } : prev);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
    // Re-calculate project completed tasks if needed
    if (updatedTask.status) {
      fetchProject(); // Lazy update for simplicity
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setProject((prev) => prev ? { ...prev, total_tasks: prev.total_tasks - 1 } : prev);
    fetchProject(); // Update completed count
  };

  // Loading skeleton for project header
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-32 bg-zinc-200 rounded" />
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-zinc-200" />
            <div className="h-6 bg-zinc-200 rounded w-48" />
          </div>
          <div className="h-4 bg-zinc-100 rounded w-full" />
          <div className="h-4 bg-zinc-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Not found
  if (notFound || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">
          Project không tồn tại
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Project này không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const isArchived = !!project.archived_at;
  const progress =
    project.total_tasks > 0
      ? Math.round((project.completed_tasks / project.total_tasks) * 100)
      : 0;

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link
          href="/app/projects"
          className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Dự án
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900 font-medium truncate">{project.name}</span>
      </div>

      {/* Project header card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-8">
        {/* Color banner */}
        <div
          className="h-2 rounded-t-xl"
          style={{ backgroundColor: project.color }}
        />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span
                className="mt-1 w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
                    {project.name}
                  </h1>
                  {isArchived && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                      <Archive className="w-3 h-3" />
                      Archived
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions (Admin/Manager only) */}
            {canMutate && (
              <div className="flex items-center gap-2 shrink-0">
                {!isArchived && (
                  <>
                    <button
                      id="btn-edit-project"
                      onClick={() => {
                        setEditError("");
                        setEditOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                    <button
                      id="btn-archive-project"
                      onClick={() => setArchiveConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Task stats */}
          <div className="mt-6 pt-5 border-t border-zinc-100">
            <div className="flex items-center justify-between text-sm text-zinc-600 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {project.completed_tasks} / {project.total_tasks} tasks hoàn thành
              </span>
              <span className="text-zinc-900 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  backgroundColor: project.color,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Archived warning banner */}
      {isArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3 mb-8">
          <Archive className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Project đã bị archive</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Không thể tạo task mới trong project này. Các task cũ vẫn có thể xem và cập nhật.
            </p>
          </div>
        </div>
      )}

      {/* Task List Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          Danh sách Task
          {!tasksLoading && (
            <span className="text-xs font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            disabled={tasksLoading}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Làm mới tasks"
          >
            <RefreshCcw className={`w-4 h-4 ${tasksLoading ? "animate-spin" : ""}`} />
          </button>
          {!isArchived && canMutate && (
            <button
              onClick={() => {
                setDefaultStatus(undefined);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm task
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board / Task Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
        {STATUS_COLUMNS.map((col) => {
          const statusTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.id === 'ToDo' ? 'bg-zinc-400' : col.id === 'InProgress' ? 'bg-blue-400' : col.id === 'InReview' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                  <h3 className="text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                    {statusTasks.length}
                  </span>
                </div>
              </div>

              <div className={`flex-1 rounded-xl p-2 space-y-3 bg-zinc-100/30 border border-zinc-200/50 min-h-[150px]`}>
                {tasksLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-32 bg-zinc-200/50 rounded-xl animate-pulse" />
                  ))
                ) : statusTasks.length > 0 ? (
                  statusTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onClick={(t) => setSelectedTaskId(t.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-200 rounded-xl">
                    <p className="text-xs text-zinc-400">Không có task</p>
                  </div>
                )}
                
                {!isArchived && canMutate && (
                  <button
                    onClick={() => {
                      setDefaultStatus(col.id as any);
                      setCreateOpen(true);
                    }}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg border border-dashed border-transparent hover:border-zinc-200 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Panels */}
      <TaskFormPanel
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setDefaultStatus(undefined);
        }}
        onCreated={handleTaskCreated}
        defaultProjectId={projectId}
        defaultStatus={defaultStatus}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />

      {/* Edit modal */}
      <ProjectFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        loading={editLoading}
        error={editError}
        mode="edit"
        initialValues={{
          name: project.name,
          description: project.description ?? "",
          color: project.color,
        }}
      />

      {/* Archive confirm dialog */}
      <ConfirmDialog
        open={archiveConfirm}
        title="Archive project này?"
        description={`Project "${project.name}" sẽ bị archive. Bạn sẽ không thể tạo task mới, nhưng các task hiện có vẫn có thể xem và cập nhật.`}
        confirmLabel="Archive project"
        loading={archiveLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveConfirm(false)}
      />

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
              t.type === "success"
                ? "bg-white border-emerald-200 text-emerald-700"
                : "bg-white border-red-200 text-red-600"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <Archive className="w-4 h-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
