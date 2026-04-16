import { getAuthUser } from "@/lib/session";
import { DashboardClient } from "./_components/DashboardClient";
import { redirect } from "next/navigation";

export default async function AppRootPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  return <DashboardClient user={user} />;
}

