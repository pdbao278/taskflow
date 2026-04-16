import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ReportsClient } from "./_components/ReportsClient";

export const metadata = {
  title: "Báo cáo Team — TaskFlow",
  description: "Xem báo cáo năng suất, task completed và thống kê từng thành viên.",
};

export default async function ReportsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Báo cáo Team</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tổng hợp năng suất làm việc của từng thành viên trong workspace.
        </p>
      </div>

      <ReportsClient />
    </div>
  );
}
