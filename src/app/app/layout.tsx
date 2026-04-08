"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "../components/LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === "taskflow_auth_event") {
        router.push("/login?message=Phiên làm việc đã hết hạn.");
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <span className="text-sm font-medium text-zinc-900">TaskFlow</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

