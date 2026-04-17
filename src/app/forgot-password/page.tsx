"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { OTPInput } from "@/app/components/auth/OTPInput";
import { CountdownTimer } from "@/app/components/auth/CountdownTimer";

const forgotSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const resetSchema = z.object({
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type ForgotFormValues = z.infer<typeof forgotSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

type ResetState = "INPUT_EMAIL" | "VERIFY_OTP" | "NEW_PASSWORD" | "SUCCESS" | "LOCKED";

function ForgotPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>("INPUT_EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [resendAvailable, setResendAvailable] = useState(false);
  const [resendCount, setResendCount] = useState(0); // To reset the timer

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onEmailSubmit = async (values: ForgotFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        if (res.status === 423) {
          setLockedSeconds(body.data.remainingSeconds);
          setState("LOCKED");
        }
        setError(body.error ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      setEmail(values.email);
      setResendAvailable(false);
      setResendCount(0);
      setState("VERIFY_OTP");
    } catch (e) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOTP = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        if (res.status === 423) {
           setLockedSeconds(body.data?.remainingSeconds || 1800);
           setState("LOCKED");
        }
        setError(body.error ?? "Mã OTP không hợp lệ.");
        return;
      }

      setOtp(code);
      setState("NEW_PASSWORD");
    } catch (e) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const onResendOTP = async () => {
    if (!resendAvailable) return;
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        if (res.status === 423) {
          setLockedSeconds(body.data?.remainingSeconds || 1800);
          setState("LOCKED");
        } else {
          setError(body.error ?? "Có lỗi xảy ra khi gửi lại mã.");
        }
        return;
      }

      setResendAvailable(false);
      setResendCount(prev => prev + 1);
    } catch (e) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (values: ResetFormValues) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          password: values.password,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        if (res.status === 423 || body?.data?.remainingSeconds) {
           setLockedSeconds(body.data?.remainingSeconds || 1800);
           setState("LOCKED");
        }
        setError(body.error ?? "Không thể đặt lại mật khẩu.");
        return;
      }

      setState("SUCCESS");
    } catch (e) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen tf-auth-bg flex items-center justify-center p-6 relative z-10">
       <div className="tf-orb tf-orb-1" />
       <div className="tf-orb tf-orb-2" />
       
       <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-3 mb-10">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-white">TF</div>
            <span className="text-xl font-bold text-white font-[family-name:var(--font-sora)]">TaskFlow</span>
          </Link>

          <div className="tf-animate-in p-8 md:p-10 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-2xl">
            {state === "INPUT_EMAIL" && (
              <>
                <div className="space-y-1.5 mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">Quên mật khẩu?</h1>
                  <p className="text-sm text-white/40">Nhập email của bạn để nhận mã xác minh đặt lại mật khẩu</p>
                </div>

                {error && (
                  <div className="tf-animate-scale mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={forgotForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/60 uppercase" htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="ban@example.com"
                      {...forgotForm.register("email")}
                    />
                    {forgotForm.formState.errors.email && <p className="text-xs text-red-400 mt-1">{forgotForm.formState.errors.email.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi mã xác minh"}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Quay lại đăng nhập</Link>
                </div>
              </>
            )}

            {state === "VERIFY_OTP" && (
              <>
                <div className="space-y-1.5 mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">Xác minh mã OTP</h1>
                  <p className="text-sm text-white/40">Chúng tôi đã gửi mã đến <span className="text-white/60">{email}</span></p>
                </div>

                {error && (
                  <div className="tf-animate-scale mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className={loading ? "opacity-50 pointer-events-none transition-opacity" : ""}>
                    <OTPInput onComplete={onVerifyOTP} disabled={loading} />
                  </div>
                  
                  <div className="text-center space-y-4 border-t border-white/10 pt-6">
                    <p className="text-xs text-white/30 text-center">Nếu không nhận được mã, vui lòng kiểm tra hộp thư rác.</p>
                    
                    {!resendAvailable ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-white/50">
                        <span>Gửi lại mã sau:</span>
                        <CountdownTimer 
                          key={resendCount}
                          initialSeconds={120} 
                          onComplete={() => setResendAvailable(true)} 
                          className="font-mono text-indigo-400 font-medium"
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={onResendOTP}
                        disabled={loading}
                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Thử lại (gửi mã mới)
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                   <button onClick={() => setState("INPUT_EMAIL")} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Đổi email khác</button>
                </div>
              </>
            )}

            {state === "NEW_PASSWORD" && (
              <>
                <div className="space-y-1.5 mb-8">
                  <h1 className="text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-sora)]">Đặt mật khẩu mới</h1>
                  <p className="text-sm text-white/40">Vui lòng nhập mật khẩu mới bảo mật hơn</p>
                </div>

                {error && (
                  <div className="tf-animate-scale mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <form onSubmit={resetForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/60 uppercase" htmlFor="password">Mật khẩu mới</label>
                    <input
                      id="password"
                      type="password"
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all"
                      placeholder="••••••••"
                      {...resetForm.register("password")}
                    />
                    {resetForm.formState.errors.password && <p className="text-xs text-red-400 mt-1">{resetForm.formState.errors.password.message}</p>}
                  </div>

                   <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/60 uppercase" htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-all"
                      placeholder="••••••••"
                      {...resetForm.register("confirmPassword")}
                    />
                    {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{resetForm.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-lg disabled:opacity-50 mt-4"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cập nhật mật khẩu"}
                  </button>
                </form>
              </>
            )}

            {state === "SUCCESS" && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Thành công!</h1>
                <p className="text-sm text-white/40 mb-10">Mật khẩu của bạn đã được thay đổi. Giờ đây bạn có thể đăng nhập bằng mật khẩu mới.</p>
                <Link 
                  href="/login" 
                  className="w-full block rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white shadow-lg hover:bg-indigo-600 transition-all"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}

            {state === "LOCKED" && (
               <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Tạm bị khóa</h1>
                <p className="text-sm text-white/40 mb-8">Bạn đã thử quá nhiều lần. Vui lòng quay lại sau:</p>
                
                <CountdownTimer 
                  initialSeconds={lockedSeconds} 
                  onComplete={() => setState("INPUT_EMAIL")} 
                  className="text-4xl font-bold bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent mb-10"
                />

                <button onClick={() => setState("INPUT_EMAIL")} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Quay lại</button>
              </div>
            )}
          </div>
       </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen tf-auth-bg flex items-center justify-center">
         <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
       </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  )
}
