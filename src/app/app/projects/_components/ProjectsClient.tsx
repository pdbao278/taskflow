"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { ProjectFormModal, type ProjectFormData } from "./ProjectFormModal";
import {
  Plus,
  Briefcase,
  CheckCircle2,
  Archive,
  Loader2,
  RefreshCcw,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  workspace_id: string;
};

type Toast = { id: number; type: "success" | "error"; message: string };

interface ProjectsClientProps {
  workspaceId: string;
  currentUserRole: string;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border animate-fade-in-up ${
            t.type === "success"
              ? "bg-white border-emerald-200 text-emerald-700"
              : "bg-white border-red-200 text-red-600"
          }`}
          onClick={() => onDismiss(t.id)}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <span className="w-4 h-4 shrink-0 text-red-500">✕</span>
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-zinc-200 mt-1 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 rounded w-3/4" />
          <div className="h-3 bg-zinc-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-zinc-100 rounded w-1/3 mt-4" />
    </div>
  );
}

export function ProjectsClient({ workspaceId, currentUserRole }: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const canMutate = currentUserRole === "Admin" || currentUserRole === "Manager";

  const addToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchProjects = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await apiFetch("/api/projects");
      const body = await res.json();
      if (body.success) {
        setProjects(body.data);
      }
    } catch {
      // apiFetch handles 401 redirect
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (data: ProjectFormData) => {
    setFormLoading(true);
    setFormError("");
    try {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!body.success) {
        setFormError(body.error || "Có lỗi xảy ra");
        return;
      }
      // Optimistic: prepend new project
      setProjects((prev) => [body.data, ...prev]);
      setModalOpen(false);
      addToast("success", "Project đã tạo thành công");
    } catch {
      setFormError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setFormLoading(false);
    }
  };

  const activeProjects = projects.filter((p) => !p.archived_at);
  const archivedProjects = projects.filter((p) => p.archived_at);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {loading ? "Đang tải..." : `${activeProjects.length} dự án đang hoạt động`}
          </span>
          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
            className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Làm mới"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {canMutate && (
          <button
            id="btn-create-project"
            onClick={() => {
              setFormError("");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
          >
            <Plus className="w-4 h-4" />
            Tạo project
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 mb-1">
            Chưa có project nào
          </h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            {canMutate
              ? "Tạo project đầu tiên của bạn để bắt đầu quản lý công việc theo dự án."
              : "Workspace này chưa có dự án nào. Liên hệ Admin hoặc Manager để tạo dự án."}
          </p>
          {canMutate && (
            <button
              onClick={() => {
                setFormError("");
                setModalOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo project đầu tiên
            </button>
          )}
        </div>
      )}

      {/* Active projects grid */}
      {!loading && activeProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {activeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Archived projects */}
      {!loading && archivedProjects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Đã archive ({archivedProjects.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {archivedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      <ProjectFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        loading={formLoading}
        error={formError}
        mode="create"
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const isArchived = !!project.archived_at;
  const progress =
    project.total_tasks > 0
      ? Math.round((project.completed_tasks / project.total_tasks) * 100)
      : 0;

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className={`group block bg-white rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isArchived
          ? "border-zinc-200 cursor-default"
          : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <div className="p-5">
        {/* Color dot + name */}
        <div className="flex items-start gap-3 mb-3">
          <span
            className="mt-1 w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1"
            style={{
              backgroundColor: project.color,
              borderColor: project.color + "40", // Fallback if needed
            } as any}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-blue-600 transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          {isArchived && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          )}
        </div>

        {/* Task stats */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {project.completed_tasks}/{project.total_tasks} tasks
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
