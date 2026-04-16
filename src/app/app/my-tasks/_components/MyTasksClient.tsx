"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";

import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { TaskCard, type TaskItem } from "../../_components/TaskCard";
import { TaskDetailPanel } from "../../_components/TaskDetailPanel";
import {
  CheckSquare,
  Filter,
  RefreshCcw,
  Search,
  EyeIcon,
} from "lucide-react";
import { TaskCardSkeleton } from "@/app/components/SkeletonLoaders";

interface MyTasksClientProps {
  userId: string;
}

export function MyTasksClient({ userId }: MyTasksClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "ToDo" | "InProgress">("All");
  const [search, setSearch] = useState("");

  const targetUserId = searchParams.get("user_id");
  const memberName = searchParams.get("member_name");
  const isReadOnly = !!targetUserId && targetUserId !== userId;

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (filter !== "All") params.append("status", filter);
    if (targetUserId && isReadOnly) params.append("user_id", targetUserId);
    const qs = params.toString();
    const url = `/api/tasks/my-tasks${qs ? `?${qs}` : ""}`;

    const res = await apiFetch(url);
    const body = await res.json();
    if (!body.success) throw new Error(body.error || "Failed to fetch tasks");
    return body.data as TaskItem[];
  };

  const { data: tasks = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["my-tasks", filter, targetUserId],
    queryFn: fetchTasks,
  });

  const showLoading = useLoadingDelay(isLoading);


  const handleTaskUpdated = (updatedTask: any) => {
    queryClient.setQueryData(["my-tasks", filter], (oldData: TaskItem[] | undefined) => {
      if (!oldData) return [];
      if (updatedTask.status === "Done" || (filter !== "All" && updatedTask.status !== filter)) {
        return oldData.filter(t => t.id !== updatedTask.id);
      }
      return oldData.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    });
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const handleTaskDeleted = (taskId: string) => {
    queryClient.setQueryData(["my-tasks", filter], (oldData: TaskItem[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter((t) => t.id !== taskId);
    });
  };

  const filteredTasks = tasks.filter((t) => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.project?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Read-only banner — Manager viewing another member's tasks (FR-11) */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-[var(--tf-warning-muted)] border border-[var(--tf-warning)]/20 rounded-xl text-sm text-[var(--tf-warning)] shadow-sm tf-animate-fade">
          <EyeIcon className="w-4 h-4 shrink-0" />
          <span>
            Đang xem task của{" "}
            <strong className="font-bold">{memberName || "thành viên"}</strong>.
            Bạn chỉ có thể xem, không thể chỉnh sửa.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 tf-animate-fade">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tf-text-muted)]" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-[var(--tf-bg-card)] border border-[var(--tf-border)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--tf-accent)] focus:border-transparent transition-all shadow-sm font-medium"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 text-[var(--tf-text-muted)] hover:text-[var(--tf-text)] bg-[var(--tf-bg-card)] border border-[var(--tf-border)] hover:border-[var(--tf-border-hover)] shadow-sm hover:shadow-md rounded-lg transition-all"
            title="Làm mới"
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-[var(--tf-bg-card)] p-1 rounded-xl border border-[var(--tf-border)] shadow-sm">
          <Filter className="w-4 h-4 text-[var(--tf-text-muted)] mx-2" />
          <div className="w-[1px] h-4 bg-[var(--tf-border)]" />
          {(["All", "ToDo", "InProgress"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all tracking-wide ${
                filter === f
                  ? "bg-gradient-to-r from-[var(--tf-accent)] to-[var(--tf-accent2)] tracking-wider text-white shadow-sm"
                  : "text-[var(--tf-text-muted)] hover:bg-[var(--tf-bg-subtle)] hover:text-[var(--tf-text)]"
              }`}
            >
              {f === "All" ? "Tất cả" : f === "ToDo" ? "To Do" : "In Progress"}
            </button>
          ))}
        </div>
      </div>

      {showLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 tf-animate-in">
          {Array.from({ length: 6 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 tf-animate-fade">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={(t) => setSelectedTaskId(t.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center tf-card bg-[var(--tf-bg-subtle)] tf-animate-in">
          <div className="w-16 h-16 bg-[var(--tf-bg-card)] shadow-sm border border-[var(--tf-border)] rounded-2xl flex items-center justify-center mb-6">
            <CheckSquare className="w-8 h-8 text-[var(--tf-text-muted)]" />
          </div>
          <h3 className="text-base text-[var(--tf-text)] font-semibold tracking-wide">
            {search ? "Không tìm thấy task" : "Bạn chưa có task nào"}
          </h3>
          <p className="text-sm text-[var(--tf-text-sub)] mt-2 max-w-xs leading-relaxed">
            {search 
              ? "Thử thay đổi từ khóa tìm kiếm của bạn."
              : "Hãy liên hệ Manager để được assign công việc hoặc tự tạo task mới."}
          </p>
        </div>
      )}

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={isReadOnly ? undefined : handleTaskUpdated}
        onDeleted={isReadOnly ? undefined : handleTaskDeleted}
        readOnly={isReadOnly}
      />
    </>
  );
}
