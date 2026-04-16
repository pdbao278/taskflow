import { redirect } from "next/navigation";
import InviteClient from "./_components/InviteClient";
import { getAuthUser } from "@/lib/session";

export default async function InvitePage(props: { searchParams: Promise<{ token?: string }> }) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Token không hợp lệ</h1>
          <p className="text-gray-500">Vui lòng kiểm tra lại đường dẫn của bạn.</p>
        </div>
      </div>
    );
  }

  const user = await getAuthUser();

  if (!user) {
    // If not logged in, redirect to login but carry the token
    const loginUrl = new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "https://taskflow-lalaboys-projects.vercel.app");
    loginUrl.searchParams.set("redirect", `/invite?token=${token}`);
    loginUrl.searchParams.set("message", "Vui lòng đăng nhập để tham gia workspace.");
    redirect(loginUrl.toString());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Chấp nhận lời mời</h1>
        <p className="text-gray-500 mb-8">
          Bạn đang đăng nhập dưới tên <strong>{user.email}</strong>. Bạn có muốn tham gia workspace không?
        </p>
        <InviteClient token={token} />
      </div>
    </div>
  );
}
