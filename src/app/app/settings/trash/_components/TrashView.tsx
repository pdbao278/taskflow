"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Trash2, Calendar, User, Folder, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast";

interface DeletedTask {
  id: string;
  title: string;
  deleted_at: string;
  project: { name: string; color: string };
  assignee: { name: string } | null;
  deleted_by: string;
}

export default function TrashView() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", "trash"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/trash");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as DeletedTask[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/restore`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "trash"] });
      // Also invalidate board/list queries if they exist
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Đã khôi phục task thành công");
    },
    onError: (err: any) => {
      toast.error(err.message || "Không thể khôi phục task");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="font-semibold text-red-900">Lỗi tải dữ liệu</h3>
        <p className="text-red-600 text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-16 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">Thùng rác trống</h3>
        <p className="text-zinc-500 mt-1 max-w-sm mx-auto">
          Không tìm thấy task nào đã xóa trong 30 ngày qua.
        </p>
      </div>
    );
  }

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const expiryDate = new Date(deletedDate);
    expiryDate.setDate(deletedDate.getDate() + 30);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Task</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dự án</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Người xóa</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Người thực hiện</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Đã xóa</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hạn khôi phục</th>
              <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Khôi phục</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {data.map((task) => {
              const daysLeft = getDaysRemaining(task.deleted_at);
              return (
                <tr 
                  key={task.id} 
                  className="group hover:bg-white hover:shadow-lg hover:shadow-zinc-200/50 transition-all duration-200 relative z-0 hover:z-10"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900">{task.title}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase tracking-tighter">ID: {task.id.slice(-8)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: task.project.color }} 
                      />
                      <span className="text-sm text-zinc-600">{task.project.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {task.deleted_by}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {task.assignee?.name || <span className="text-zinc-400 italic">Chưa phân công</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {formatDate(task.deleted_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                      daysLeft <= 3 
                        ? "bg-red-50 text-red-600" 
                        : daysLeft <= 7 
                        ? "bg-amber-50 text-amber-600" 
                        : "bg-zinc-100 text-zinc-600"
                    }`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft} ngày còn lại
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => restoreMutation.mutate(task.id)}
                      disabled={restoreMutation.isPending}
                      title="Khôi phục task"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                    >
                      <RefreshCcw className={`w-5 h-5 ${restoreMutation.isPending && restoreMutation.variables === task.id ? "animate-spin text-zinc-900" : ""}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
