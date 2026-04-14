"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { TaskCard, type TaskItem } from "../../_components/TaskCard";
import { TaskDetailPanel } from "../../_components/TaskDetailPanel";
import { TaskFormPanel } from "../../_components/TaskFormPanel";
import { 
  Plus, 
  RefreshCcw, 
  Search,
  Users,
  Briefcase,
  Flag,
} from "lucide-react";

interface TeamKanbanClientProps {
  currentUserRole: string;
}

const STATUS_COLUMNS = [
  { id: "ToDo", label: "To Do", color: "bg-zinc-400" },
  { id: "InProgress", label: "In Progress", color: "bg-blue-400" },
  { id: "InReview", label: "In Review", color: "bg-purple-400" },
  { id: "Done", label: "Done", color: "bg-emerald-400" },
] as const;

export function TeamKanbanClient({ currentUserRole }: TeamKanbanClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<"ToDo" | "InProgress" | "InReview" | "Done" | undefined>(undefined);
  
  // Filters
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (assigneeId) params.append("assigneeId", assigneeId);
      if (priority) params.append("priority", priority);

      const res = await apiFetch(`/api/tasks?${params.toString()}`);
      const body = await res.json();
      if (body.success) {
        setTasks(body.data);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [projectId, assigneeId, priority]);

  const fetchMeta = useCallback(async () => {
    try {
      const [projRes, membersRes] = await Promise.all([
        apiFetch("/api/projects").then(r => r.json()),
        apiFetch("/api/workspaces/members").then(r => r.json())
      ]);
      if (projRes.success) setProjects(projRes.data);
      if (membersRes.success) setMembers(membersRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const handleTaskCreated = (newTask: any) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.project?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
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
          
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
          >
            <option value="">Dự án: Tất cả</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
          >
            <option value="">Assignee: Tất cả</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

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

          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {(currentUserRole === "Admin" || currentUserRole === "Manager") && (
          <button
            onClick={() => {
              setDefaultStatus(undefined);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors w-full lg:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Thêm Task
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-24">
        {STATUS_COLUMNS.map((col) => {
          const statusTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-bold text-zinc-600 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-zinc-50/50 border border-zinc-200/50 rounded-2xl p-2 space-y-3 min-h-[300px]">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />
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
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-200 rounded-xl">
                    <p className="text-xs text-zinc-400">Không có task</p>
                  </div>
                )}
                
                {(currentUserRole === "Admin" || currentUserRole === "Manager") && (
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

      {/* Panels */}
      <TaskFormPanel
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setDefaultStatus(undefined);
        }}
        onCreated={handleTaskCreated}
        defaultStatus={defaultStatus}
      />

      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </>
  );
}
