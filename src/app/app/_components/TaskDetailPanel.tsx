"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import {
  X,
  Loader2,
  CalendarDays,
  AlertCircle,
  User,
  Flag,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Clock,
  Edit3,
  Save,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { TaskComments } from "./TaskComments";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssigneeInfo = { id: string | null; name: string; email: string | null };

type ActivityLog = {
  id: string;
  action_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user: { id: string; name: string } | null;
};

export type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: "ToDo" | "InProgress" | "InReview" | "Done";
  priority: "Low" | "Medium" | "High" | "Urgent";
  due_date: string | null;
  created_at: string;
  assignee: AssigneeInfo | null;
  creator: { id: string; name: string; email: string };
  project: { id: string; name: string; color: string; archived_at: string | null };
  activity_logs: ActivityLog[];
  current_user_role: string;
  current_user_id: string;
};

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated?: (task: TaskDetail) => void;
  onDeleted?: (taskId: string) => void;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const editSchema = z.object({
  title: z.string().min(1, "Title không được để trống").max(200, "Title tối đa 200 ký tự"),
  description: z.string().max(5000, "Mô tả tối đa 5000 ký tự").optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]),
  status: z.enum(["ToDo", "InProgress", "InReview", "Done"]),
  due_date: z.string().optional().nullable(),
  assignee_id: z.string().optional().nullable(),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  Low:    "text-sky-600 bg-sky-50 border-sky-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  High:   "text-orange-600 bg-orange-50 border-orange-200",
  Urgent: "text-red-600 bg-red-50 border-red-200",
};
const PRIORITY_LABELS: Record<string, string> = {
  Low: "Low", Medium: "Medium", High: "High", Urgent: "Urgent",
};
const STATUS_LABELS: Record<string, string> = {
  ToDo: "To Do", InProgress: "In Progress", InReview: "In Review", Done: "Done",
};
const STATUS_STYLES: Record<string, string> = {
  ToDo:       "text-zinc-600 bg-zinc-100",
  InProgress: "text-blue-600 bg-blue-50",
  InReview:   "text-purple-600 bg-purple-50",
  Done:       "text-emerald-600 bg-emerald-50",
};
const ACTION_LABELS: Record<string, string> = {
  Create:       "đã tạo task",
  Update:       "đã cập nhật",
  StatusChange: "đã đổi trạng thái",
  Comment:      "đã comment",
  Other:        "đã thay đổi",
};

function isOverdue(dateStr: string | null | undefined, status: string): boolean {
  if (!dateStr || status === "Done") return false;
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function toDateInputValue(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  return new Date(isoStr).toISOString().split("T")[0];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskDetailPanel({
  taskId,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDetailPanelProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [apiError, setApiError] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [panelWidth, setPanelWidth] = useState(576); // default max-w-xl approx
  const [isResizing, setIsResizing] = useState(false);

  const open = !!taskId;

  // Load saved width
  useEffect(() => {
    const saved = localStorage.getItem("taskflow_panel_width");
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= 400) setPanelWidth(w);
    }
  }, []);

  // Resize logic
  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= window.innerWidth * 0.95) {
        setPanelWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("taskflow_panel_width", panelWidth.toString());
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, panelWidth]);

  const addToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const watchedDueDate = watch("due_date");
  const watchedStatus = watch("status");

  const fetchTask = useCallback(async (id: string) => {
    setLoading(true);
    setNotFound(false);
    setEditing(false);
    setApiError("");
    try {
      const res = await apiFetch(`/api/tasks/${id}`);
      if (res.status === 404) { setNotFound(true); return; }
      const body = await res.json();
      if (body.success) {
        setTask(body.data);
        reset({
          title: body.data.title,
          description: body.data.description ?? "",
          priority: body.data.priority,
          status: body.data.status,
          due_date: toDateInputValue(body.data.due_date),
          assignee_id: body.data.assignee?.id ?? null,
        });
      } else setNotFound(true);
    } catch { /* 401 handled by apiFetch */ }
    finally { setLoading(false); }
  }, [reset]);

  // Fetch members for edit mode
  useEffect(() => {
    if (!open) return;
    apiFetch("/api/workspaces/members")
      .then((r) => r.json())
      .then((b) => { if (b.success) setMembers(b.data); })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (taskId) fetchTask(taskId);
    else { setTask(null); setEditing(false); }
  }, [taskId, fetchTask]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSave = async (data: EditForm) => {
    if (!task) return;
    setSaveLoading(true);
    setApiError("");
    try {
      const payload: Record<string, unknown> = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        assignee_id: data.assignee_id || null,
      };
      const res = await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.success) {
        setApiError(body.error || "Có lỗi xảy ra");
        return;
      }
      setTask(body.data);
      setEditing(false);
      addToast("Task đã được cập nhật");
      onUpdated?.(body.data);
    } catch { setApiError("Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setSaveLoading(false); }
  };

  const handleDelete = async () => {
    if (!task) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!body.success) { addToast(body.error || "Có lỗi xảy ra", "error"); return; }
      onDeleted?.(task.id);
      onClose();
    } catch { addToast("Có lỗi xảy ra", "error"); }
    finally { setDeleteLoading(false); }
  };

  const isManagerOrAdmin = task?.current_user_role === "Manager" || task?.current_user_role === "Admin";
  const isCreator = task?.creator.id === task?.current_user_id;
  const isAssignee = task?.assignee?.id != null && task?.assignee.id === task?.current_user_id;

  const canEditStatus = !!task && (isManagerOrAdmin || isAssignee || isCreator);
  const canEditContent = !!task && (isManagerOrAdmin || isCreator);
  const canEdit = canEditContent || canEditStatus;
  const canDelete = task && (isManagerOrAdmin || isCreator);
  const overdue = task ? isOverdue(task.due_date, task.status) : false;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết task"
        className={`fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        } ${isResizing ? "transition-none select-none" : ""}`}
        style={{ 
          width: typeof window !== "undefined" && window.innerWidth < 640 ? "100%" : `${panelWidth}px`,
          maxWidth: "100vw"
        }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-[60] group hover:bg-zinc-200 transition-colors ${
            isResizing ? "bg-zinc-300" : ""
          }`}
        >
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-zinc-300 rounded-full opacity-0 group-hover:opacity-100" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2">
            {task?.project && (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: task.project.color }}
              />
            )}
            <span className="text-sm font-semibold text-zinc-900 truncate max-w-xs">
              {loading ? "Đang tải..." : task?.project?.name ?? "Chi tiết task"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button
                id="btn-task-edit"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
            )}
            {canDelete && (
              <button
                id="btn-task-delete"
                onClick={() => setDeleteConfirm(true)}
                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Xóa task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-zinc-200 rounded w-3/4" />
              <div className="h-4 bg-zinc-100 rounded w-1/2" />
              <div className="h-24 bg-zinc-100 rounded" />
            </div>
          )}

          {notFound && (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <p className="text-sm text-zinc-500">Task không tồn tại hoặc đã bị xóa.</p>
            </div>
          )}

          {task && !loading && (
            <form onSubmit={handleSubmit(handleSave)} noValidate>
              <div className="p-6 space-y-5">
                {/* Title */}
                {editing ? (
                  <div>
                    <label htmlFor="edit-title" className="block text-xs font-medium text-zinc-500 mb-1">
                      Tiêu đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-title"
                      {...register("title")}
                      type="text"
                      maxLength={200}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-offset-0 ${
                        errors.title
                          ? "border-red-300 focus:ring-red-200 bg-red-50"
                          : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-200"
                      } ${!canEditContent ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""}`}
                      disabled={!canEditContent}
                    />
                    {errors.title && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{errors.title.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-2">
                      <h1 className="text-lg font-bold text-zinc-900 leading-snug flex-1">
                        {task.title}
                      </h1>
                      {overdue && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Tạo bởi <strong>{task.creator.name}</strong> lúc{" "}
                      {formatDate(task.created_at)}
                    </p>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Status */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-1">Trạng thái</p>
                    {editing ? (
                      <div className="relative">
                        <select
                          {...register("status")}
                          disabled={!canEditStatus}
                          title={!canEditStatus ? "Chỉ assignee hoặc Manager mới có thể đổi trạng thái" : ""}
                          className={`w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-zinc-200 pr-7 ${
                            !canEditStatus ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""
                          }`}
                        >
                          {["ToDo","InProgress","InReview","Done"].map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-1">
                      <Flag className="w-3 h-3 inline mr-0.5" />Độ ưu tiên
                    </p>
                    {editing ? (
                      <div className="relative">
                        <select
                          {...register("priority")}
                          disabled={!canEditContent}
                          className={`w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-zinc-200 pr-7 ${
                            !canEditContent ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""
                          }`}
                        >
                          {["Low","Medium","High","Urgent"].map((p) => (
                            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${PRIORITY_STYLES[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-1">
                      <User className="w-3 h-3 inline mr-0.5" />Assignee
                    </p>
                    {editing ? (
                      <div className="relative">
                        <select
                          {...register("assignee_id")}
                          disabled={!isManagerOrAdmin}
                          className={`w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-zinc-200 pr-7 ${
                            !isManagerOrAdmin ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""
                          }`}
                        >
                          <option value="">-- Không assign --</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    ) : (
                      task.assignee && task.assignee.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                            {getInitials(task.assignee.name)}
                          </div>
                          <span className="text-sm text-zinc-700">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400 italic">
                          {task.assignee?.name === "[Removed User]" ? "[Removed User]" : "Chưa assign"}
                        </span>
                      )
                    )}
                  </div>

                  {/* Due date */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-1">
                      <CalendarDays className="w-3 h-3 inline mr-0.5" />Hạn hoàn thành
                    </p>
                    {editing ? (
                      <div>
                        <input
                          {...register("due_date")}
                          type="date"
                          disabled={!canEditContent}
                          className={`w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 ${
                            !canEditContent ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""
                          }`}
                        />
                        {isOverdue(watchedDueDate, watchedStatus) && (
                          <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : task.due_date ? (
                      <span className={`text-sm font-medium ${overdue ? "text-red-600" : "text-zinc-700"}`}>
                        {formatDate(task.due_date)}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1.5">Mô tả</p>
                  {editing ? (
                    <textarea
                      {...register("description")}
                      rows={5}
                      maxLength={5000}
                      disabled={!canEditContent}
                      placeholder="Mô tả chi tiết..."
                      className={`w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-lg outline-none resize-y focus:ring-2 focus:ring-zinc-200 ${
                        !canEditContent ? "bg-zinc-50 cursor-not-allowed opacity-75" : ""
                      }`}
                    />
                  ) : task.description ? (
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">Chưa có mô tả.</p>
                  )}
                </div>

                {/* API error in editing mode */}
                {apiError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />{apiError}
                  </div>
                )}

                {/* Edit actions */}
                {editing && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setApiError(""); }}
                      disabled={saveLoading}
                      className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      id="btn-save-task"
                      type="submit"
                      disabled={saveLoading}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Lưu thay đổi
                    </button>
                  </div>
                )}

                {/* Activity Log (PRD FR-10) */}
                {!editing && task.activity_logs && task.activity_logs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Lịch sử hoạt động</span>
                      {task.activity_logs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowAllLogs(!showAllLogs)}
                          className="text-zinc-600 hover:text-zinc-900 border border-zinc-200 bg-white px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors"
                        >
                          {showAllLogs ? "Thu gọn" : "Xem thêm"}
                        </button>
                      )}
                    </h3>
                    <div className="space-y-3">
                      {(showAllLogs ? task.activity_logs : task.activity_logs.slice(0, 1)).map((log) => {
                        const renderMessage = () => {
                          const userName = <span className="font-semibold text-zinc-900">{log.user?.name ?? "System"}</span>;
                          const timestamp = (
                            <span className="text-zinc-400 font-normal">
                              {" "}at {new Date(log.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          );
                          
                          if (log.action_type === "Create") {
                            return <>Created by {userName}{timestamp}</>;
                          }
                          
                          if (log.action_type === "StatusChange" && log.field_changed === "status") {
                            const oldLabel = STATUS_LABELS[log.old_value || ""] || log.old_value;
                            const newLabel = STATUS_LABELS[log.new_value || ""] || log.new_value;
                            return (
                              <>
                                {userName} changed status from <span className="font-medium">{oldLabel}</span> → <span className="font-medium text-zinc-900">{newLabel}</span>{timestamp}
                              </>
                            );
                          }
                          
                          if (log.action_type === "Update") {
                            const fieldName = log.field_changed || "task";
                            return (
                              <>
                                {userName} updated {fieldName}:{" "}
                                <span className="text-zinc-500 line-through">{log.old_value || "none"}</span>{" "}
                                → <span className="text-zinc-900">{log.new_value || "none"}</span>{timestamp}
                              </>
                            );
                          }
                          
                          if (log.action_type === "Comment") {
                            return <>{userName} comment: <span className="italic text-zinc-500">"{log.new_value}"</span>{timestamp}</>;
                          }

                          return (
                            <>
                              {userName} {ACTION_LABELS[log.action_type] || log.action_type}{timestamp}
                              {log.field_changed && log.field_changed !== "deleted_at" && (
                                <span className="text-zinc-400">
                                  {" "}trường <em>{log.field_changed}</em>
                                  {log.old_value && log.new_value && (
                                    <>: <span className="line-through text-zinc-400">{log.old_value}</span> → <span className="text-zinc-700">{log.new_value}</span></>
                                  )}
                                </span>
                              )}
                            </>
                          );
                        };

                        return (
                          <div key={log.id} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0 mt-0.5">
                              {log.user ? getInitials(log.user.name) : "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-600 leading-relaxed">
                                {renderMessage()}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {new Date(log.created_at).toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Comments (FR-06) */}
                {!editing && task && (
                  <TaskComments 
                    taskId={task.id}
                    currentUserId={task.current_user_id}
                    currentUserRole={task.current_user_role}
                    members={members}
                    onCommentsChanged={() => fetchTask(task.id)}
                  />
                )}
              </div>
            </form>
          )}
        </div>

        {/* Delete confirm dialog */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-black/20">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-base font-semibold text-zinc-900 mb-2">Xóa task này?</h3>
              <p className="text-sm text-zinc-500 mb-5">
                Task sẽ bị xóa khỏi danh sách. Bạn có thể khôi phục trong 30 ngày.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  id="btn-confirm-delete-task"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xóa task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
                t.type === "success"
                  ? "bg-white border-emerald-200 text-emerald-700"
                  : "bg-white border-red-200 text-red-600"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
