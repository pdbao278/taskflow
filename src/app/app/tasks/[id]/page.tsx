import { getAuthUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { TaskDetailView } from "./_components/TaskDetailView";

export default async function TaskDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 w-full">
      <TaskDetailView taskId={id} />
    </div>
  );
}
