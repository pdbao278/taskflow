"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

type MeResponse =
  | { success: true; data: { user: { id: string; email: string; name: string } } }
  | { success: false; error?: string };

export function MyTasksClient() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await apiFetch("/api/auth/me");
      const body = (await res.json()) as MeResponse;

      if (!cancelled && body.success) {
        setEmail(body.data.user.email);
      }
    })().catch(() => {
      // apiFetch will redirect on 401; ignore errors here.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-2xl w-full px-6 py-10">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-900">My Tasks (placeholder)</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {email ? `Đang đăng nhập: ${email}` : "Đang tải thông tin tài khoản..."}
        </p>
      </div>
      <p className="text-sm text-zinc-500">
        Đây là trang placeholder cho /app/my-tasks. Sau khi hoàn thành feature task
        management, nội dung dashboard sẽ được hiển thị tại đây.
      </p>
    </div>
  );
}

