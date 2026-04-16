"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";

import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { ProjectFormModal, type ProjectFormData } from "./ProjectFormModal";
import {
  Plus,
  Briefcase,
  CheckCircle2,
  Archive,
  RefreshCcw,
} from "lucide-react";
import { ProjectCardSkeleton } from "@/app/components/SkeletonLoaders";
import { useToastStore } from "@/lib/toast";

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

interface ProjectsClientProps {
  workspaceId: string;
  currentUserRole: string;
}

export function ProjectsClient({ workspaceId, currentUserRole }: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const { addToast } = useToastStore();

  const showLoading = useLoadingDelay(loading);

  const canMutate = currentUserRole === "Admin" || currentUserRole === "Manager";

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
      addToast("Project đã tạo thành công", "success");
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
      <div className="flex items-center justify-between mb-6 tf-animate-fade">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--tf-text-sub)] font-medium">
            {showLoading ? "Đang tải..." : `${activeProjects.length} dự án đang hoạt động`}
          </span>

          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
            className="p-1.5 text-[var(--tf-text-muted)] hover:text-[var(--tf-text)] hover:bg-[var(--tf-bg-subtle)] rounded-md transition-colors"
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
            className="tf-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Tạo project
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {showLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 tf-animate-in">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center tf-card tf-animate-in">
          <div className="w-16 h-16 bg-[var(--tf-bg-subtle)] rounded-2xl flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-[var(--tf-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--tf-text)] mb-1">
            Chưa có project nào
          </h3>
          <p className="text-sm text-[var(--tf-text-sub)] max-w-xs">
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
              className="mt-6 tf-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Tạo project đầu tiên
            </button>
          )}
        </div>
      )}

      {/* Active projects grid */}
      {!loading && activeProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8 tf-animate-fade">
          {activeProjects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      )}

      {/* Archived projects */}
      {!loading && archivedProjects.length > 0 && (
        <div className="tf-animate-fade">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="w-4 h-4 text-[var(--tf-text-muted)]" />
            <h2 className="text-xs font-bold text-[var(--tf-text-sub)] uppercase tracking-[0.1em]">
              Đã archive ({archivedProjects.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 opacity-60 hover:opacity-100 transition-opacity duration-300">
            {archivedProjects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
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
    </>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const isArchived = !!project.archived_at;
  const progress =
    project.total_tasks > 0
      ? Math.round((project.completed_tasks / project.total_tasks) * 100)
      : 0;

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className={`group block tf-card tf-animate-in ${
        isArchived ? "cursor-default" : ""
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="p-6">
        {/* Color dot + name */}
        <div className="flex items-start gap-4 mb-4">
          <span
            className="mt-1 w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[var(--tf-text)] truncate group-hover:text-[var(--tf-accent)] transition-colors">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-[var(--tf-text-sub)] mt-1 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
          {isArchived && (
            <span className="shrink-0 tf-badge bg-[var(--tf-bg-subtle)] text-[var(--tf-text-muted)] border border-[var(--tf-border)]">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          )}
        </div>

        {/* Task stats */}
        <div className="mt-6 pt-4 border-t border-[var(--tf-border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--tf-text-sub)] mb-2 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--tf-success)]" />
              {project.completed_tasks}/{project.total_tasks} tasks
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-[var(--tf-bg-subtle)] rounded-full h-2 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
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
