"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { Trash2, Save, AlertTriangle, Loader2 } from "lucide-react";

const workspaceSchema = z.object({
  name: z.string().min(1, "Tên workspace không được để trống").max(100, "Tên workspace tối đa 100 ký tự"),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface WorkspaceSettingsViewProps {
  workspaceId: string;
  initialName: string;
  currentUserRole: string;
}

export default function WorkspaceSettingsView({ 
  workspaceId, 
  initialName, 
  currentUserRole 
}: WorkspaceSettingsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = currentUserRole === "Admin";

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: initialName,
    },
  });

  const onUpdate = async (data: WorkspaceFormValues) => {
    if (!isAdmin) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: "success", text: "Cập nhật workspace thành công!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error || "Có lỗi xảy ra." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Không thể kết nối tới server." });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!isAdmin) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (result.success) {
        // Workspace deleted, redirect to home or workspace creation
        window.location.href = "/app"; 
      } else {
        alert(result.error || "Không thể xóa workspace.");
        setDeleteLoading(false);
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra khi xóa workspace.");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* General Settings Section */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
          Thông tin chung
        </h3>
        
        <form onSubmit={handleSubmit(onUpdate)} className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Tên Workspace</label>
            <input
              {...register("name")}
              type="text"
              className={`w-full border rounded-lg px-4 py-2.5 bg-zinc-50 focus:outline-none focus:ring-2 transition-all ${
                errors.name ? "border-red-500 focus:ring-red-100" : "border-zinc-200 focus:ring-blue-100 focus:border-blue-400"
              }`}
              placeholder="Nhập tên workspace..."
              disabled={!isAdmin || loading}
            />
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${
              message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"
            }`}>
              {message.text}
            </div>
          )}

          {isAdmin && (
            <button
              type="submit"
              disabled={loading || !isDirty}
              className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-zinc-200 w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu thay đổi
            </button>
          )}

          {!isAdmin && (
            <p className="text-xs text-zinc-500 italic">
              * Bạn không có quyền chỉnh sửa thông tin workspace.
            </p>
          )}
        </form>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm shadow-red-50/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">Khu vực nguy hiểm</h3>
              <p className="text-sm text-zinc-500">Các hành động dưới đây không thể hoàn tác.</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-lg border border-red-100">
              <div>
                <p className="font-semibold text-red-900 text-sm">Xóa Workspace này</p>
                <p className="text-xs text-red-700 mt-1">
                  Mọi dữ liệu bao gồm thành viên, dự án và task sẽ bị xóa vĩnh viễn.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-all shadow-sm shadow-red-100"
              >
                Xóa Workspace
              </button>
            </div>
          ) : (
            <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-sm font-bold text-red-900 mb-4">
                Bạn có chắc chắn muốn xóa workspace này không?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Xác nhận Xóa
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="bg-white border border-zinc-200 text-zinc-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
