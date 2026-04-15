"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface MyTasksClientProps {
  userId: string;
}

export function MyTasksClient({ userId }: MyTasksClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "ToDo" | "InProgress">("All");
  const [search, setSearch] = useState("");

  // Read-only mode: Manager viewing another member's tasks (from Reports page)
  const targetUserId = searchParams.get("user_id");
  const memberName = searchParams.get("member_name");
  const isReadOnly = !!targetUserId && targetUserId !== userId;

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (filter !== "All") params.append("status", filter);
    // Pass user_id for Manager read-only view (FR-11)
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

  const handleTaskUpdated = (updatedTask: any) => {
    // Update data optimistically in cache
    queryClient.setQueryData(["my-tasks", filter], (oldData: TaskItem[] | undefined) => {
      if (!oldData) return [];
      // If task status changes and no longer matches current filter, we could remove it.
      // But simple updating is fine here too since users might want to see it slide away or we rely on invalidate.
      // PRD says: "Optimistic UI khi đổi status"
      // FR-07: exclude "Done" tasks always. If status changes to Done or out of filter, we remove.
      if (updatedTask.status === "Done" || (filter !== "All" && updatedTask.status !== filter)) {
        return oldData.filter(t => t.id !== updatedTask.id);
      }
      return oldData.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    });
    // Invalidate slightly later to sync correctly
    queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const handleTaskDeleted = (taskId: string) => {
    queryClient.setQueryData(["my-tasks", filter], (oldData: TaskItem[] | undefined) => {
      if (!oldData) return [];
      return oldData.filter((t) => t.id !== taskId);
    });
  };

  // Searching is client-side according to typical pattern if we already fetch all (or we could fetch server side, but frontend search implies client side filtering of the fetched list here, PRD: "Search theo task title.")
  const filteredTasks = tasks.filter((t) => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.project?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Read-only banner — Manager viewing another member's tasks (FR-11) */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <EyeIcon className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Đang xem task của{" "}
            <strong>{memberName || "thành viên"}</strong>.
            Bạn chỉ có thể xem, không thể chỉnh sửa.
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 mr-1" />
          {(["All", "ToDo", "InProgress"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {f === "All" ? "Tất cả" : f === "ToDo" ? "To Do" : "In Progress"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={(t) => setSelectedTaskId(t.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
            <CheckSquare className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-zinc-900 font-semibold">
            {search ? "Không tìm thấy task" : "Bạn chưa có task nào"}
          </h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs">
            {search 
              ? "Thử thay đổi từ khóa tìm kiếm của bạn."
              : "Hãy liên hệ Manager để được assign công việc."}
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
