import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { MyTasksClient } from "./_components/MyTasksClient";

export default async function MyTasksPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Task của tôi</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tất cả công việc được giao cho bạn trong workspace này.
        </p>
      </div>

      <MyTasksClient userId={user.id} />
    </div>
  );
}
