import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";
import TrashView from "./_components/TrashView";

export default async function TrashPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  if (!activeWorkspace) {
    redirect("/app/workspaces/new");
  }

  // Only Admin or Manager can access trash
  const role = activeWorkspace.currentRole;
  if (role !== "Admin" && role !== "Manager") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-900">Không có quyền truy cập</h1>
          <p className="text-zinc-500 mt-2">Chỉ Admin hoặc Manager mới có quyền truy cập Thùng rác.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Thùng rác
          </h1>
          <p className="text-zinc-500 mt-1">
            Các task đã xóa trong vòng 30 ngày qua. Bạn có thể khôi phục chúng về workspace.
          </p>
        </div>
      </div>
      
      <TrashView />
    </div>
  );
}
