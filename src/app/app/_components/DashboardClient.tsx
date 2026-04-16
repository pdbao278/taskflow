"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";
import { 
  Plus, 
  Briefcase, 
  CheckSquare, 
  FolderKanban, 
  ChevronRight,
  TrendingUp,
  Clock,
  ListTodo
} from "lucide-react";
import { Skeleton } from "@/app/components/SkeletonLoaders";

interface Stats {
  totalProjects: number;
  totalMyTasks: number;
  upcomingTasks: number;
}

export function DashboardClient({ user }: { user: any }) {
  const [stats, setStats] = useState<Stats>({ totalProjects: 0, totalMyTasks: 0, upcomingTasks: 0 });
  const [loading, setLoading] = useState(true);

  const showLoading = useLoadingDelay(loading);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiFetch("/api/projects").then(r => r.json()),
        apiFetch("/api/tasks/my-tasks").then(r => r.json())
      ]);

      if (projRes.success && taskRes.success) {
        setStats({
          totalProjects: projRes.data.length,
          totalMyTasks: taskRes.data.length,
          upcomingTasks: taskRes.data.filter((t: any) => t.due_date && new Date(t.due_date) > new Date()).length
        });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Chào {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Chào mừng bạn quay lại TaskFlow. Đây là tổng quan công việc của bạn.
          </p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/app/my-tasks"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            <CheckSquare className="w-4 h-4" />
            Xem Task
          </Link>
          <Link 
            href="/app/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tạo Dự Án
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Dự án đang chạy" 
          value={stats.totalProjects} 
          icon={Briefcase} 
          isLoading={showLoading}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="Task của tôi" 
          value={stats.totalMyTasks} 
          icon={ListTodo} 
          isLoading={showLoading}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="Task sắp đến hạn" 
          value={stats.upcomingTasks} 
          icon={Clock} 
          isLoading={showLoading}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* Quick Actions / Empty State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Workspace / Welcome State */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-2">Bắt đầu quản lý công việc</h2>
            <p className="text-zinc-500 text-sm mb-6 max-w-sm">
              Tổ chức quy trình làm việc của bạn với các Project và Kanban board để tối ưu hóa hiệu suất team.
            </p>
          </div>
          <div className="space-y-3">
            <QuickActionButton 
              title="Đi đến Kanban Team" 
              icon={FolderKanban} 
              href="/app/team"
            />
            <QuickActionButton 
              title="Xem Task của tôi" 
              icon={CheckSquare} 
              href="/app/my-tasks"
            />
          </div>
        </div>

        {/* Workspace Tips */}
        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]">
          <div>
            <h2 className="text-lg font-bold mb-2">Mẹo nhanh Workflow</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Sử dụng các phím tắt và tính năng thông minh để quản lý task nhanh hơn.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Kéo thả task trên board để đổi status
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Gán Assignee để nhận thông báo
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Đặt Deadline để không bỏ lỡ task
              </li>
            </ul>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <Link href="/app/projects" className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Bắt đầu ngay <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading, color, bgColor }: any) {
  if (isLoading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-zinc-200">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-12" />
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all group shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-500">{title}</span>
        <div className={`${bgColor} ${color} p-2 rounded-lg`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}

function QuickActionButton({ title, icon: Icon, href }: any) {
  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600 group-hover:bg-white group-hover:shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-zinc-700">{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
