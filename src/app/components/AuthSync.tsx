"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthSync() {
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

  return null;
}
