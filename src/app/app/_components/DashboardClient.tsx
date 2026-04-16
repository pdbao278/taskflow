"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery } from "@tanstack/react-query";
import { useLoadingDelay } from "@/hooks/useLoadingDelay";
import { 
  Plus, 
  Briefcase, 
  CheckSquare, 
  FolderKanban, 
  ChevronRight,
  TrendingUp,
  Clock,
  ListTodo,
  ArrowRight
} from "lucide-react";
import { Skeleton } from "@/app/components/SkeletonLoaders";

interface Stats {
  totalProjects: number;
  totalMyTasks: number;
  upcomingTasks: number;
}

export function DashboardClient({ user }: { user: any }) {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [projRes, taskRes] = await Promise.all([
        apiFetch("/api/projects").then(r => r.json()),
        apiFetch("/api/tasks/my-tasks").then(r => r.json())
      ]);

      if (projRes.success && taskRes.success) {
        return {
          totalProjects: projRes.data.length,
          totalMyTasks: taskRes.data.length,
          upcomingTasks: taskRes.data.filter((t: any) => t.due_date && new Date(t.due_date) > new Date()).length
        };
      }
      throw new Error("Failed to fetch");
    }
  });

  const showLoading = useLoadingDelay(isLoading);

  return (
    <div className="p-6 md:p-10 w-full max-w-7xl mx-auto space-y-8 h-full">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 tf-animate-in">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--tf-text)] tracking-tight">
            Chào {user.name} 👋
          </h1>
          <p className="text-[var(--tf-text-sub)] text-sm mt-2 font-medium">
            Sẵn sàng để hoàn thành công việc hôm nay chưa?
          </p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/app/my-tasks"
            className="tf-btn-secondary"
          >
            <CheckSquare className="w-4 h-4" />
            Xem Task
          </Link>
          <Link 
            href="/app/projects"
            className="tf-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Tạo Dự Án
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard 
          title="Dự án đang chạy" 
          value={stats?.totalProjects ?? 0} 
          icon={Briefcase} 
          isLoading={showLoading}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
          delay="tf-stagger-1"
        />
        <StatCard 
          title="Task của tôi" 
          value={stats?.totalMyTasks ?? 0} 
          icon={ListTodo} 
          isLoading={showLoading}
          color="text-purple-600"
          bgColor="bg-purple-50"
          delay="tf-stagger-2"
        />
        <StatCard 
          title="Task sắp đến hạn" 
          value={stats?.upcomingTasks ?? 0} 
          icon={Clock} 
          isLoading={showLoading}
          color="text-amber-600"
          bgColor="bg-amber-50"
          delay="tf-stagger-3"
        />
      </div>

      {/* Quick Actions / Empty State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 tf-animate-in tf-stagger-4">
        {/* Active Workspace / Welcome State */}
        <div className="tf-card p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
            <TrendingUp className="w-32 h-32 text-[var(--tf-accent)]" />
          </div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-[var(--tf-radius-md)] flex items-center justify-center mb-5 shadow-sm">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-[var(--tf-text)] mb-2">Bắt đầu quản lý công việc</h2>
            <p className="text-[var(--tf-text-sub)] text-sm mb-8 max-w-md leading-relaxed">
              Tổ chức quy trình làm việc của bạn với các Project và Kanban board để tối ưu hóa hiệu suất team một cách tốt nhất.
            </p>
          </div>
          <div className="space-y-3 relative z-10">
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
        <div className="bg-[#18181b] text-white p-8 rounded-[var(--tf-radius-xl)] shadow-xl flex flex-col justify-between relative overflow-hidden">
          {/* Subtle gradient glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-lg font-bold mb-3 tracking-wide">Mẹo nhanh Workflow</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              Sử dụng các tính năng này để quản lý task nhanh hơn.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-4 text-sm text-white/70">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
                Kéo thả task trên board để đổi status dễ dàng
              </li>
              <li className="flex items-center gap-4 text-sm text-white/70">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                </div>
                Gán Assignee để nhận thông báo thời gian thực
              </li>
              <li className="flex items-center gap-4 text-sm text-white/70">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                Đặt Deadline để hệ thống nhắc nhở tự động
              </li>
            </ul>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <Link href="/app/projects" className="group text-sm font-semibold flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
              Bắt đầu ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading, color, bgColor, delay }: any) {
  if (isLoading) {
    return (
      <div className={`tf-card p-6 h-[116px] ${delay} tf-animate-in`}>
        <Skeleton className="h-4 w-28 mb-4" />
        <Skeleton className="h-10 w-16" />
      </div>
    );
  }

  return (
    <div className={`tf-card p-6 group ${delay} tf-animate-in hover:border-[var(--tf-border-hover)] relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--tf-text-sub)]">{title}</span>
        <div className={`${bgColor} ${color} p-2.5 rounded-[var(--tf-radius-md)] border border-white/50 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-[var(--tf-text)] tracking-tight">{value}</div>
    </div>
  );
}

function QuickActionButton({ title, icon: Icon, href }: any) {
  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-3.5 rounded-[var(--tf-radius-md)] border border-[var(--tf-border)] bg-[var(--tf-bg-subtle)] hover:bg-white hover:border-[var(--tf-border-hover)] hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-md bg-white border border-[var(--tf-border)] flex items-center justify-center text-[var(--tf-text-sub)] group-hover:text-[var(--tf-accent)] group-hover:border-[var(--tf-accent-muted)] transition-colors shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-[var(--tf-text)]">{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--tf-text-muted)] group-hover:text-[var(--tf-text)] group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
