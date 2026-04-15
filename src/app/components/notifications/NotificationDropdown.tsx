"use client"; 

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MessageSquare, AtSign, UserPlus, Clock, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface Notification {
  id: string;
  type: string;
  reference_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "TaskAssigned":
      return <UserPlus className="text-blue-500" size={16} />;
    case "TaskCommented":
      return <MessageSquare className="text-emerald-500" size={16} />;
    case "Mention":
      return <AtSign className="text-purple-500" size={16} />;
    case "TaskDueSoon":
      return <Clock className="text-amber-500" size={16} />;
    default:
      return <Bell size={16} className="text-zinc-400" />;
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString("vi-VN");
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const { data: notifications, isLoading, isFetching, refetch } = useQuery<Notification[]>({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await apiFetch("/api/notifications");
      const json = await res.json();
      return json.success ? json.data : [];
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onMutate: async () => {
      // Optimistic UI update
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      queryClient.setQueryData(["notifications", "unread-count"], 0);
      queryClient.setQueryData(["notifications", "list"], (old: Notification[] | undefined) => {
        return old?.map(n => ({ ...n, read_at: new Date().toISOString() }));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, unread }: { id: string, unread: boolean }) => {
      await apiFetch(`/api/notifications/${id}/read`, { 
        method: "PATCH",
        body: JSON.stringify({ unread })
      });
    },
    onMutate: async ({ id, unread }) => {
      // Optimistic UI update
      queryClient.setQueryData(["notifications", "list"], (old: Notification[] | undefined) => {
        return old?.map(n => n.id === id ? { ...n, read_at: unread ? null : new Date().toISOString() } : n);
      });
      queryClient.setQueryData(["notifications", "unread-count"], (prev: number | undefined) => {
        const currentCount = prev || 0;
        return unread ? currentCount + 1 : Math.max(0, currentCount - 1);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 max-h-[500px] bg-white rounded-xl shadow-2xl border border-zinc-200 flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-900">Thông báo</h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className={`p-1 rounded-md text-zinc-400 hover:text-blue-500 hover:bg-blue-50 transition-all ${isFetching ? "animate-spin text-blue-500" : ""}`}
            title="Làm mới"
          >
            <RotateCw size={14} />
          </button>
        </div>
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={notifications?.every(n => n.read_at) || markAllReadMutation.isPending}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:text-zinc-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
        >
          <Check size={12} strokeWidth={3} />
          Đọc tất cả
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-medium">Đang tải thông báo...</span>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="divide-y divide-zinc-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`group relative flex items-start gap-3 p-4 hover:bg-zinc-50/80 transition-all ${
                  !n.read_at ? "bg-blue-50/40" : ""
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !n.read_at ? "bg-white shadow-sm" : "bg-zinc-100/50"
                }`}>
                  {getNotificationIcon(n.type)}
                </div>
                
                <Link
                  href={`/app/tasks/${n.reference_id}`}
                  onClick={() => {
                    if (!n.read_at) toggleReadMutation.mutate({ id: n.id, unread: false });
                    onClose();
                  }}
                  className="flex-1 min-w-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className={`text-[13px] leading-relaxed ${!n.read_at ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
                      {n.content}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(n.created_at)}
                      </span>
                      {!n.read_at && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleReadMutation.mutate({ id: n.id, unread: !!n.read_at });
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 text-zinc-400 hover:text-blue-600`}
                  title={n.read_at ? "Đánh dấu là chưa đọc" : "Đánh dấu là đã đọc"}
                >
                  <Check size={14} className={n.read_at ? "text-zinc-300" : "text-blue-500"} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 flex flex-col items-center justify-center gap-4 text-zinc-400">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center border-2 border-dashed border-zinc-200">
              <Bell size={28} className="text-zinc-200" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-900">Hộp thư trống</p>
              <p className="text-xs text-zinc-500 mt-1">Bạn không có thông báo nào mới.</p>
            </div>
          </div>
        )}
      </div>

      {notifications && notifications.length > 0 && (
        <div className="p-3 bg-zinc-50/50 border-t border-zinc-100 text-center">
          <p className="text-[10px] text-zinc-400 font-medium italic">
            Hiển thị tối đa 30 thông báo gần nhất
          </p>
        </div>
      )}
    </div>
  );
}

function Bell({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

