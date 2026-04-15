"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { WeeklyChart } from "./WeeklyChart";
import { MemberStatsTable } from "./MemberStatsTable";
import { BarChart2, RefreshCcw } from "lucide-react";

export interface WeekData {
  week: string;
  label: string;
  count: number;
}

export interface MemberStat {
  user_id: string;
  name: string;
  email: string;
  assigned: number;
  completed: number;
  overdue: number;
  completion_rate: number;
}

async function fetchSummary(): Promise<{ members: MemberStat[] }> {
  const res = await apiFetch("/api/reports/summary");
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "Không tải được báo cáo");
  return body.data;
}

async function fetchWeekly(): Promise<{ weeks: WeekData[] }> {
  const res = await apiFetch("/api/reports/weekly-completed");
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "Không tải được dữ liệu tuần");
  return body.data;
}

export function ReportsClient() {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: fetchSummary,
    retry: 1,
  });

  const {
    data: weekly,
    isLoading: weeklyLoading,
    isError: weeklyError,
    refetch: refetchWeekly,
  } = useQuery({
    queryKey: ["reports-weekly"],
    queryFn: fetchWeekly,
    retry: 1,
  });

  const isLoading = summaryLoading || weeklyLoading;
  const isError = summaryError || weeklyError;

  const handleRefetch = () => {
    refetchSummary();
    refetchWeekly();
  };

  if (isError) {
    // Hiển thị error state theo PRD 10.3
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-red-200 rounded-2xl bg-red-50/50">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
          <BarChart2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-zinc-900 font-semibold">Có lỗi xảy ra</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-xs">
          Không thể tải dữ liệu báo cáo. Vui lòng thử lại.
        </p>
        <button
          onClick={handleRefetch}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex justify-end">
        <button
          onClick={handleRefetch}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {/* Section 1: Bar chart */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Tasks Completed (Last 4 Weeks)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Số task hoàn thành theo từng tuần gần nhất
          </p>
        </div>
        <WeeklyChart data={weekly?.weeks} isLoading={weeklyLoading} />
      </section>

      {/* Divider */}
      <div className="border-t border-zinc-100" />

      {/* Section 2: Member stats table */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Thống kê thành viên
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Click vào tên thành viên để xem chi tiết task của họ
          </p>
        </div>
        <MemberStatsTable data={summary?.members} isLoading={summaryLoading} />
      </section>
    </div>
  );
}
