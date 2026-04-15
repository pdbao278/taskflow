"use client";

import type { WeekData } from "./ReportsClient";
import { BarChart2 } from "lucide-react";

interface WeeklyChartProps {
  data?: WeekData[];
  isLoading: boolean;
}

export function WeeklyChart({ data, isLoading }: WeeklyChartProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <div className="flex items-end gap-4 h-48">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3">
              <div
                className="w-full bg-zinc-100 rounded-t-lg animate-pulse"
                style={{ height: `${40 + i * 20}%` }}
              />
              <div className="h-3 w-12 bg-zinc-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0 || data.every((w) => w.count === 0)) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center mb-3">
          <BarChart2 className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-700">Chưa có dữ liệu để hiển thị</p>
        <p className="text-xs text-zinc-400 mt-1">
          Dữ liệu sẽ xuất hiện khi có task được hoàn thành trong 4 tuần gần nhất
        </p>
      </div>
    );
  }

  const counts = data.map((w) => w.count);
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6">
      <div className="flex items-stretch gap-3 sm:gap-4 h-52 px-1">
        {data.map((week) => {
          // Calculate height: minimum 5% for 0 count to keep bars visible but subtle
          // and minimum 15% if count > 0 to make it pop.
          const percentage = (week.count / maxCount) * 100;
          const heightPct = week.count > 0 
            ? Math.max(percentage, 12) 
            : 4;

          return (
            <div
              key={week.week}
              className="flex-1 flex flex-col items-center gap-2 group h-full"
            >
              <div className="relative flex-1 w-full flex items-end h-full">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-zinc-900 text-white text-[10px] sm:text-xs font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                    {week.count} task{week.count !== 1 ? "" : ""}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                    week.count > 0
                      ? "bg-emerald-500 group-hover:bg-emerald-600 shadow-sm"
                      : "bg-zinc-200"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              {/* Count label */}
              <span className={`text-[10px] font-bold ${week.count > 0 ? "text-zinc-700" : "text-zinc-300"}`}>
                {week.count}
              </span>

              {/* Week label */}
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium truncate w-full text-center">
                {week.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Y-axis hints */}
      <div className="mt-4 pt-4 border-t border-zinc-50 flex justify-between text-[10px] text-zinc-400 font-semibold px-2 uppercase tracking-tighter">
        <span>0 tasks</span>
        <span className="text-zinc-300 font-normal">Năng suất hoàn thành</span>
        <span>{maxCount} tasks</span>
      </div>
    </div>
  );
}
