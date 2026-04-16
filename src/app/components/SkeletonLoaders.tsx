"use client";

import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`tf-animate-shimmer rounded-md ${className}`} />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="tf-card p-4 flex flex-col gap-3 h-[180px]">
      <div className="flex justify-between items-start">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 mt-2" />
      <Skeleton className="h-5 w-1/2" />
      
      <div className="mt-auto pt-3 flex justify-between items-center border-t border-[var(--tf-border-subtle)]">
        <div className="flex gap-2 items-center">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="tf-card p-6 flex flex-col gap-4 h-[180px]">
      <div className="flex justify-between items-start">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-3 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col gap-4 min-w-[320px]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
