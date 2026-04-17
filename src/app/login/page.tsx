"use client";

import { useEffect, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { CountdownTimer } from "@/app/components/auth/CountdownTimer";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginState = "IDLE" | "LOCKED";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoginState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [lockedSeconds, setLockedSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const message = searchParams.get("message");
    if (message) {
      setError(message);
    }
  }, [searchParams]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        if (body?.data?.locked && typeof body.data.remainingSeconds === "number") {
          setLockedSeconds(body.data.remainingSeconds);
          setState("LOCKED");
        }
        setError(body.error ?? "Đăng nhập thất bại. Vui lòng thử lại.");
        return;
      }

      // Success - Redirect immediately
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

  return (
    <div className="min-h-screen tf-auth-bg flex">
      {/* Floating orbs */}
      <div className="tf-orb tf-orb-1" />
      <div className="tf-orb tf-orb-2" />

      {/* ─── Left: Brand Panel ──────────────────────── */}
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
              Quản lý công việc
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                chưa bao giờ dễ hơn.
              </span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm">
              Thay thế spreadsheet và chat bằng một workspace duy nhất. Assign,
              track và report — tất cả trong TaskFlow.
            </p>
          </div>
        </div>

        <div className="tf-animate-in tf-stagger-4">
          <div className="flex items-center gap-3 text-white/20 text-xs">
            <div className="flex -space-x-2">
              {["#6366f1", "#8b5cf6", "#a855f7"].map((clr, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-[#131338] text-[8px] font-bold text-white flex items-center justify-center"
                  style={{ background: clr }}
                >
                  {["Q", "V", "M"][i]}
                </div>
              ))}
            </div>
            <span>Hàng trăm task được quản lý mỗi ngày</span>
          </div>
        </div>
      </div>

      {/* ─── Right: Login Form ─────────────────────────────────────── */}
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
            {state === "IDLE" && (
              <>
                <div className="space-y-1.5 mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">
                    Đăng nhập
                  </h1>
                  <p className="text-sm text-white/40">
                    Chào mừng bạn quay lại TaskFlow
                  </p>
                </div>

                {error && (
                  <div className="tf-animate-scale mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="ban@example.com"
                      {...register("email")}
                    />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="password">
                      Mật khẩu
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="••••••••"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                    
                    <div className="flex justify-end mt-1.5">
                      <Link href="/forgot-password" title="Quên mật khẩu?" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                        Quên mật khẩu?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Đăng nhập
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-sm text-white/30 text-center">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    onClick={() => router.push("/register")}
                  >
                    Đăng ký miễn phí
                  </button>
                </p>
              </>
            )}

            {state === "LOCKED" && (
              <div className="tf-animate-in text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Tài khoản tạm bị khóa</h1>
                <p className="text-sm text-white/40 mb-8">
                  Bạn đã nhập sai mật khẩu quá số lần cho phép. <br /> Vui lòng thử lại sau:
                </p>
                
                <CountdownTimer 
                  initialSeconds={lockedSeconds} 
                  onComplete={() => setState("IDLE")} 
                  className="text-4xl font-bold bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent mb-10"
                />

                <button
                  type="button"
                  onClick={() => setState("IDLE")}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen tf-auth-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
