"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Tên workspace không được để trống").max(100, "Tên workspace tối đa 100 ký tự"),
});

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

export default function NewWorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
  });

  const onSubmit = async (data: CreateWorkspaceValues) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create workspace
      const createRes = await apiFetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const createResult = await createRes.json();
      if (!createResult.success) {
        throw new Error(createResult.error || "Không thể tạo workspace.");
      }

      const newWorkspaceId = createResult.data.id;

      // 2. Set as active
      const activeRes = await apiFetch("/api/workspaces/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: newWorkspaceId }),
      });

      if (!activeRes.ok) {
        throw new Error("Không thể thiết lập workspace mới làm mặc định.");
      }

      // 3. Redirect
      window.location.href = "/app";
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <Link 
        href="/app" 
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Quay lại Dashboard
      </Link>

      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Tạo Workspace mới</h1>
          <p className="text-zinc-500 mt-2">
            Workspace là nơi lưu trữ các dự án và thành viên trong team của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Tên Workspace</label>
            <input
              {...register("name")}
              type="text"
              autoFocus
              className={`w-full border rounded-xl px-4 py-3 bg-zinc-50 focus:outline-none focus:ring-4 transition-all ${
                errors.name ? "border-red-500 focus:ring-red-100" : "border-zinc-200 focus:ring-zinc-100 focus:border-zinc-400"
              }`}
              placeholder="VD: Marketing Team, TaskFlow Devs..."
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-red-500 font-medium ml-1">{errors.name.message}</p>}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-lg shadow-zinc-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Tạo Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
