"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { TaskCard, type TaskItem } from "../../_components/TaskCard";
import { TaskDetailPanel } from "../../_components/TaskDetailPanel";
import { 
  Loader2, 
  CheckSquare, 
  Filter,
  RefreshCcw,
  Search
} from "lucide-react";

interface MyTasksClientProps {
  userId: string;
}

export function MyTasksClient({ userId }: MyTasksClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | "ToDo" | "InProgress">("All");
  const [search, setSearch] = useState("");

  const fetchTasks = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await apiFetch("/api/tasks/my-tasks");
      const body = await res.json();
      if (body.success) {
        setTasks(body.data);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskUpdated = (updatedTask: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const filteredTasks = tasks
    .filter((t) => {
      if (filter === "All") return t.status !== "Done";
      return t.status === filter;
    })
    .filter((t) => 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.project?.name.toLowerCase().includes(search.toLowerCase())
    );

  // Sort by Overdue first, then by priority (descending), then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const now = new Date();
    const aOverdue = a.due_date && new Date(a.due_date) < now && a.status !== "Done";
    const bOverdue = b.due_date && new Date(b.due_date) < now && b.status !== "Done";

    // 1. Overdue comes first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // 2. Then Level (Priority) descending
    const PRIORITY_MAP = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
    const aPrio = PRIORITY_MAP[a.priority as keyof typeof PRIORITY_MAP] || 0;
    const bPrio = PRIORITY_MAP[b.priority as keyof typeof PRIORITY_MAP] || 0;

    if (aPrio !== bPrio) return bPrio - aPrio;

    // 3. Fallback to due date
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && !b.due_date) return -1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }

    return 0;
  });

  return (
    <>
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
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map((task) => (
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
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </>
  );
}
