"use client";

import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-200 rounded-md ${className}`} />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-6 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <hr className="border-zinc-50" />
      <div className="flex justify-between items-center">
        <div className="flex gap-1 items-center">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="pt-2 flex justify-between items-end">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full border-2 border-white" />
          ))}
        </div>
        <div className="text-right">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-w-[320px]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
