"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, Palette } from "lucide-react";

const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Tên project không được để trống")
    .max(200, "Tên project tối đa 200 ký tự"),
  description: z
    .string()
    .max(2000, "Mô tả tối đa 2000 ký tự")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Màu phải là hex hợp lệ"),
});

type FormValues = z.infer<typeof projectSchema>;

export type ProjectFormData = FormValues;

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  loading: boolean;
  error?: string;
  initialValues?: Partial<FormValues>;
  mode: "create" | "edit";
}

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
];

export function ProjectFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
  initialValues,
  mode,
}: ProjectFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      color: initialValues?.color ?? "#3B82F6",
    },
  });

  const selectedColor = watch("color");

  // Reset form when modal opens or initialValues change
  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name ?? "",
        description: initialValues?.description ?? "",
        color: initialValues?.color ?? "#3B82F6",
      });
    }
  }, [open, initialValues, reset]);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "Tạo project mới" : "Chỉnh sửa project"}
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {mode === "create" ? "Tạo project mới" : "Chỉnh sửa project"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "create"
                ? "Thêm một dự án mới vào workspace"
                : "Cập nhật thông tin project"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {/* Global error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Tên project <span className="text-red-500">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              placeholder="Ví dụ: Website Redesign"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                errors.name ? "border-red-300 bg-red-50" : "border-zinc-300"
              }`}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1.5">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Mô tả{" "}
              <span className="text-zinc-400 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              id="project-description"
              rows={4}
              placeholder="Mô tả ngắn về mục tiêu của dự án..."
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none ${
                errors.description ? "border-red-300 bg-red-50" : "border-zinc-300"
              }`}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1.5">{errors.description.message}</p>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-zinc-400" />
              Màu nhãn <span className="text-red-500">*</span>
            </label>

            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c, { shouldValidate: true })}
                  className={`w-8 h-8 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedColor === c
                      ? "ring-2 ring-offset-2 ring-zinc-400 scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Chọn màu ${c}`}
                />
              ))}
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border border-zinc-200 shrink-0"
                style={{ backgroundColor: selectedColor }}
              />
              <input
                type="text"
                placeholder="#3B82F6"
                maxLength={7}
                className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                  errors.color ? "border-red-300 bg-red-50" : "border-zinc-300"
                }`}
                {...register("color")}
              />
            </div>
            {errors.color && (
              <p className="text-xs text-red-500 mt-1.5">{errors.color.message}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "Tạo project" : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
