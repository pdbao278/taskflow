"use client";

import { useState, useEffect } from "react";

import { useForm as useRHForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, Loader2, Trash2, Copy, CheckCircle2, Clock, RefreshCcw } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  role: z.enum(["Admin", "Manager", "Member"]),
});

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending";
  joinedAt: string;
  isSelf: boolean;
  inviteToken?: string;
  expiresAt?: string;
};

const Countdown = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      const distance = end - now;
      
      if (distance < 0) {
        setTimeLeft("Đã hết hạn");
        return;
      }
      
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1">
      <Clock className="w-3 h-3" />
      {timeLeft}
    </span>
  );
};

export default function MembersView({
  initialMembers,
  workspaceId,
  currentUserRole
}: {
  initialMembers: Member[],
  workspaceId: string,
  currentUserRole: string
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const form = useRHForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "Member" }
  });

  const isAdmin = currentUserRole === "Admin";

  const onInvite = async (values: z.infer<typeof inviteSchema>) => {
    setLoading(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) {
        setInviteError(data.error);
      } else {
        setInviteSuccess(data.data.message);
        form.reset({ email: "", role: "Member" });
        await fetchMembers();
      }
    } catch (err: any) {
      setInviteError("Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`);
    const data = await res.json();
    if (data.success) {
      // Map self
      const updated = data.data.map((m: any) => ({
        ...m,
        isSelf: members.find((old) => old.email === m.email)?.isSelf || false
      }));
      setMembers(updated);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra");
    }
  };

  const removeMember = async (userId: string) => {
    if (!isAdmin) return;
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này?")) return;
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMembers(members.filter(m => m.id !== userId));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Đã có lỗi xảy ra");
    }
  };

  const handleCopyLink = (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${baseUrl}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm transition-all hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-800">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Mời thành viên mới
          </h2>
          <form onSubmit={form.handleSubmit(onInvite)} className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-1 w-full">
              <input
                type="email"
                placeholder="Nhập email thành viên..."
                className="w-full border border-zinc-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-2">{form.formState.errors.email.message}</p>
              )}
              {inviteError && <p className="text-sm text-red-500 mt-2">{inviteError}</p>}
              {inviteSuccess && <p className="text-sm text-green-500 mt-2">{inviteSuccess}</p>}
            </div>
            
            <div className="w-full sm:w-40 relative">
              <select
                className="w-full border border-zinc-300 rounded-lg px-4 py-2.5 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow cursor-pointer"
                {...form.register("role")}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Member">Member</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Gửi lời mời
            </button>
          </form>
        </div>
      )}

      {/* Active Member List */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-800">Thành viên chính thức</h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{members.filter(m => m.status === 'Active').length}</span>
          </div>
          <button 
            onClick={fetchMembers}
            disabled={loading}
            className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Làm mới"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tên</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vai trò</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.filter(m => m.status === 'Active').length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-6 py-8 text-center text-zinc-500">
                    <p className="text-sm">Chưa có thành viên nào.</p>
                  </td>
                </tr>
              ) : (
                members.filter(m => m.status === 'Active').map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {member.name !== "-" ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                            {member.name}
                            {member.isSelf && <span className="bg-zinc-100 text-zinc-600 text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase">Bạn</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isAdmin && !member.isSelf ? (
                        <div className="relative inline-block w-32">
                          <select
                            value={member.role}
                            onChange={(e) => updateRole(member.id, e.target.value)}
                            className="w-full border-zinc-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow cursor-pointer appearance-none shadow-sm"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Member">Member</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-md shrink-0">
                          {member.role}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!member.isSelf && (
                          <button
                            onClick={() => removeMember(member.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            title="Xóa thành viên"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Member List - Only shown to Admin and if there are pending members */}
      {isAdmin && members.filter(m => m.status === 'Pending').length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-800">Đang chờ xác nhận</h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{members.filter(m => m.status === 'Pending').length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vai trò cấp sẵn</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Đường link</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Thời gian còn lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {members.filter(m => m.status === 'Pending').map((member) => (
                  <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-zinc-800">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1.5 text-sm font-medium text-zinc-500 bg-zinc-100/50 rounded-md shrink-0">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.inviteToken ? (
                        <button
                          onClick={() => handleCopyLink(member.inviteToken!)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            copiedToken === member.inviteToken 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200/0'
                          }`}
                        >
                          {copiedToken === member.inviteToken ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Đã copy</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                          )}
                        </button>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {member.expiresAt && <Countdown expiresAt={member.expiresAt} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
