"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(1, "Tên không được để trống").max(100),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        setError(
          body.error ??
            "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin và thử lại.",
        );
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("taskflow_auth_event", Date.now().toString());
      }

      const redirectPath = searchParams.get("redirect") || "/app/my-tasks";
      router.push(redirectPath);
    } catch (e) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="min-h-screen tf-auth-bg flex">
      {/* Floating orbs */}
      <div className="tf-orb tf-orb-1" />
      <div className="tf-orb tf-orb-2" />
      <div className="tf-orb tf-orb-3" />

      {/* ─── Left: Brand Panel (desktop only) ──────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative z-10">
        <div>
          <Link href="/" className="flex items-center gap-3 mb-20">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-sm text-white shadow-lg shadow-indigo-500/25">
              TF
            </div>
            <span className="text-xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">
              TaskFlow
            </span>
          </Link>

          <div className="tf-animate-in">
            <h2 className="text-3xl font-extrabold text-white leading-tight tracking-tight mb-4 font-[family-name:var(--font-sora)]">
              Bắt đầu quản lý
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                công việc ngay hôm nay.
              </span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm">
              Chỉ mất 30 giây để tạo tài khoản. Không cần thẻ tín dụng, miễn phí cho team nhỏ.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="tf-animate-in tf-stagger-3 mt-12 space-y-4">
            {[
              "Kanban board kéo thả trực quan",
              "Thông báo in-app & mention",
              "Báo cáo năng suất tự động",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-sm text-white/30">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tf-animate-in tf-stagger-5 text-xs text-white/20">
          Miễn phí — không yêu cầu thẻ tín dụng
        </div>
      </div>

      {/* ─── Right: Register Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-10">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-sm text-white shadow-lg shadow-indigo-500/25">
              TF
            </div>
            <span className="text-lg font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">
              TaskFlow
            </span>
          </Link>

          <div className="tf-animate-in p-8 md:p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-2xl">
            <div className="space-y-1.5 mb-8">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">
                  Tạo tài khoản
                </h1>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm text-white/40">
                Tham gia TaskFlow hoàn toàn miễn phí
              </p>
            </div>

            {error && (
              <div className="tf-animate-scale mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="name">
                  Tên hiển thị
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  className={inputClass}
                  placeholder="Nguyễn Văn A"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="ban@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="password">
                    Mật khẩu
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="confirmPassword">
                    Xác nhận
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  <>
                    Tạo tài khoản
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-sm text-white/30 text-center">
              Đã có tài khoản?{" "}
              <button
                type="button"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={() => router.push("/login")}
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen tf-auth-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
