"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { apiFetch } from "@/lib/apiFetch";
import {
  X,
  Loader2,
  CalendarDays,
  AlertCircle,
  User,
  Folder,
  Flag,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; color: string };
type Member  = { id: string; name: string; email: string };

export type TaskFormData = {
  title: string;
  description?: string | null;
  project_id: string;
  assignee_id?: string | null;
  priority: "Low" | "Medium" | "High" | "Urgent";
  due_date?: string | null;
  status: "ToDo" | "InProgress" | "InReview" | "Done";
};

export type CreatedTask = TaskFormData & {
  id: string;
  created_at: string;
  assignee: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; color: string };
};

interface TaskFormPanelProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created task after successful API response */
  onCreated?: (task: CreatedTask) => void;
  /** Pre-select a project when opened from project detail page */
  defaultProjectId?: string;
  /** Pre-select a status when opened from Kanban column */
  defaultStatus?: "ToDo" | "InProgress" | "InReview" | "Done";
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Title không được để trống")
    .max(200, "Title tối đa 200 ký tự"),
  description: z
    .string()
    .max(5000, "Mô tả tối đa 5000 ký tự")
    .optional()
    .nullable(),
  project_id: z.string().min(1, "Project là bắt buộc"),
  assignee_id: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  due_date: z.string().optional().nullable(),
  status: z.enum(["ToDo", "InProgress", "InReview", "Done"]),
});

type TaskSchemaType = z.infer<typeof taskSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "Low",    label: "Low",      color: "text-sky-600 bg-sky-50 border-sky-200" },
  { value: "Medium", label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "High",   label: "High",       color: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "Urgent", label: "Urgent", color: "text-red-600 bg-red-50 border-red-200" },
] as const;

const STATUS_OPTIONS = [
  { value: "ToDo",       label: "To Do" },
  { value: "InProgress", label: "In Progress" },
  { value: "InReview",   label: "In Review" },
  { value: "Done",       label: "Done" },
] as const;

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormPanel({
  open,
  onClose,
  onCreated,
  defaultProjectId,
  defaultStatus,
}: TaskFormPanelProps) {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [members, setMembers]       = useState<Member[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskSchemaType>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      project_id: defaultProjectId ?? "",
      assignee_id: null,
      priority: "Medium",
      due_date: null,
      status: defaultStatus ?? "ToDo",
    },
  });

  const watchedDueDate = watch("due_date");
  const watchedPriority = watch("priority");

  // Load projects and members when panel opens
  useEffect(() => {
    if (!open) return;

    setDataLoading(true);
    setApiError("");

    Promise.all([
      apiFetch("/api/projects").then((r) => r.json()),
      apiFetch("/api/workspaces/members").then((r) => r.json()),
    ])
      .then(([projRes, membersRes]) => {
        if (projRes.success) {
          // Filter out archived
          setProjects((projRes.data as Project[]).filter((p: any) => !p.archived_at));
        }
        if (membersRes.success) {
          setMembers(membersRes.data as Member[]);
        }
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [open]);

  // Pre-fill default project and status
  useEffect(() => {
    if (open) {
      if (defaultProjectId) {
        setValue("project_id", defaultProjectId);
      }
      if (defaultStatus) {
        setValue("status", defaultStatus);
      }
    }
  }, [open, defaultProjectId, defaultStatus, setValue]);

  // Focus first input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleClose = useCallback(() => {
    reset();
    setApiError("");
    onClose();
  }, [reset, onClose]);

  const onSubmit = async (data: TaskSchemaType) => {
    setSubmitting(true);
    setApiError("");

    try {
      const payload: Record<string, unknown> = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      };

      const res = await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!body.success) {
        setApiError(body.error || "Có lỗi xảy ra");
        return;
      }

      onCreated?.(body.data);
      handleClose();
    } catch {
      setApiError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === watchedPriority);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over panel (from right — PRD 12.3) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo task mới"
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Tạo task mới</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Điền thông tin bên dưới để tạo task</p>
          </div>
          <button
            id="btn-close-task-panel"
            onClick={handleClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Đóng panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          noValidate
        >
          {/* Title */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              {...register("title")}
              ref={(el) => {
                register("title").ref(el);
                (firstInputRef as any).current = el;
              }}
              type="text"
              placeholder="Nhập tiêu đề task..."
              maxLength={200}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-all focus:ring-2 focus:ring-offset-0 ${
                errors.title
                  ? "border-red-300 focus:ring-red-200 bg-red-50"
                  : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Project */}
          <div>
            <label
              htmlFor="task-project"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              <Folder className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
              Project <span className="text-red-500">*</span>
            </label>
            {dataLoading ? (
              <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
            ) : (
              <div className="relative">
                <select
                  id="task-project"
                  {...register("project_id")}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none appearance-none transition-all focus:ring-2 focus:ring-offset-0 pr-9 ${
                    errors.project_id
                      ? "border-red-300 focus:ring-red-200 bg-red-50"
                      : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
                  }`}
                >
                  <option value="">-- Chọn project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            )}
            {errors.project_id && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.project_id.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Mô tả{" "}
              <span className="text-xs text-zinc-400 font-normal">(Markdown supported)</span>
            </label>
            <textarea
              id="task-description"
              {...register("description")}
              rows={4}
              maxLength={5000}
              placeholder="Mô tả chi tiết về task..."
              className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none resize-y transition-all focus:ring-2 focus:ring-offset-0 ${
                errors.description
                  ? "border-red-300 focus:ring-red-200 bg-red-50"
                  : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
              }`}
            />
            {errors.description && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Row: Priority + Status */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label
                htmlFor="task-priority"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                <Flag className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                Độ ưu tiên
              </label>
              <div className="relative">
                <select
                  id="task-priority"
                  {...register("priority")}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-offset-0 focus:border-zinc-500 focus:ring-zinc-200 pr-9"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
              {priorityOption && (
                <span
                  className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${priorityOption.color}`}
                >
                  {priorityOption.label}
                </span>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="task-status"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Trạng thái
              </label>
              <div className="relative">
                <select
                  id="task-status"
                  {...register("status")}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-offset-0 focus:border-zinc-500 focus:ring-zinc-200 pr-9"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row: Assignee + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <label
                htmlFor="task-assignee"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                <User className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                Assignee
              </label>
              {dataLoading ? (
                <div className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
              ) : (
                <div className="relative">
                  <select
                    id="task-assignee"
                    {...register("assignee_id")}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-offset-0 focus:border-zinc-500 focus:ring-zinc-200 pr-9"
                  >
                    <option value="">-- Không assign --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Due date */}
            <div>
              <label
                htmlFor="task-due-date"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                Hạn hoàn thành
              </label>
              <input
                id="task-due-date"
                {...register("due_date")}
                type="date"
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-offset-0 focus:border-zinc-500 focus:ring-zinc-200"
              />
              {/* Overdue preview badge — PRD 10.1 */}
              {isOverdue(watchedDueDate) && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Overdue
                </span>
              )}
            </div>
          </div>

          {/* API error */}
          {apiError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {apiError}
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3 shrink-0 bg-zinc-50/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            id="btn-submit-task"
            type="submit"
            form=""
            disabled={submitting}
            onClick={handleSubmit(onSubmit)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo task
          </button>
        </div>
      </div>
    </>
  );
}
