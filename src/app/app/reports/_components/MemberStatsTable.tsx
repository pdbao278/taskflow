"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberStat } from "./ReportsClient";
import { Users, ArrowUpDown, ArrowDown, ArrowUp, ExternalLink } from "lucide-react";

interface MemberStatsTableProps {
  data?: MemberStat[];
  isLoading: boolean;
}

type SortField = "completion_rate" | "assigned" | "completed" | "overdue";
type SortDir = "asc" | "desc";

export function MemberStatsTable({ data, isLoading }: MemberStatsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("completion_rate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleRowClick = (userId: string, userName: string) => {
    // Navigate to My Tasks filtered by this member (read-only for Manager)
    router.push(`/app/my-tasks?user_id=${encodeURIComponent(userId)}&member_name=${encodeURIComponent(userName)}`);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80">
              {["Thành viên", "Assigned", "Completed", "Overdue", "Completion Rate"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-zinc-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full animate-pulse" />
                    <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
                  </div>
                </td>
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-3 w-10 bg-zinc-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center mb-3">
          <Users className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-700">Chưa có dữ liệu để hiển thị</p>
        <p className="text-xs text-zinc-400 mt-1">
          Dữ liệu sẽ xuất hiện khi có thành viên được assign task
        </p>
      </div>
    );
  }

  // Sort data client-side
  const sorted = [...data].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "desc"
      ? <ArrowDown className="w-3 h-3 text-zinc-700" />
      : <ArrowUp className="w-3 h-3 text-zinc-700" />;
  };

  const ColHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <th
      className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide cursor-pointer select-none hover:text-zinc-800 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/80">
            <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Thành viên
            </th>
            <ColHeader field="assigned" label="Assigned" />
            <ColHeader field="completed" label="Completed" />
            <ColHeader field="overdue" label="Overdue" />
            <ColHeader field="completion_rate" label="Completion Rate" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((member, idx) => {
            const isRemoved = member.name === "[Removed User]";

            return (
              <tr
                key={member.user_id}
                onClick={() => !isRemoved && handleRowClick(member.user_id, member.name)}
                className={`border-b border-zinc-50 transition-colors ${
                  isRemoved
                    ? "opacity-50 cursor-default"
                    : "hover:bg-zinc-50/80 cursor-pointer group"
                } ${idx === sorted.length - 1 ? "border-b-0" : ""}`}
              >
                {/* Member name + avatar */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-zinc-600">
                        {isRemoved ? "?" : member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-zinc-900 text-sm">
                          {member.name}
                        </span>
                        {!isRemoved && (
                          <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      {member.email && (
                        <span className="text-xs text-zinc-400">{member.email}</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Assigned */}
                <td className="px-5 py-4">
                  <span className="text-zinc-700 font-medium">{member.assigned}</span>
                </td>

                {/* Completed */}
                <td className="px-5 py-4">
                  <span className="text-emerald-700 font-medium">{member.completed}</span>
                </td>

                {/* Overdue */}
                <td className="px-5 py-4">
                  {member.overdue > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      {member.overdue}
                    </span>
                  ) : (
                    <span className="text-zinc-400 font-medium">0</span>
                  )}
                </td>

                {/* Completion Rate */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          member.completion_rate >= 80
                            ? "bg-emerald-500"
                            : member.completion_rate >= 50
                            ? "bg-amber-500"
                            : "bg-red-400"
                        }`}
                        style={{ width: `${member.completion_rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 min-w-[2.5rem] text-right">
                      {member.completion_rate}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
