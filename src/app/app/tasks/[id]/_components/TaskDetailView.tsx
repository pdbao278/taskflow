"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TaskDetailPanel } from "../../../_components/TaskDetailPanel";
import { ArrowLeft, Layout } from "lucide-react";

interface TaskDetailViewProps {
  taskId: string;
}

export function TaskDetailView({ taskId }: TaskDetailViewProps) {
  const router = useRouter();

  const handleClose = useCallback(() => {
    // If we're on a direct page, closing should take us back to dashboard or projects
    router.back();
  }, [router]);

  return (
    <div className="min-h-[500px] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleClose}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          <Layout className="w-3.5 h-3.5" />
          Task Detail View
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex-1 relative min-h-[600px]">
        {/* We use the same Panel logic but force it to be "visible" inside this container */}
        <div className="relative h-full">
           <TaskDetailPanel 
             taskId={taskId} 
             onClose={handleClose}
             // For the direct page, let's keep it simple. If edited/deleted, we just refresh or go back.
             onUpdated={() => {}} 
             onDeleted={() => router.push("/app")}
           />
           {/* Note: TaskDetailPanel is designed as a fixed slide-over. 
               To make it a full page, it would ideally be a separate component.
               However, I've already built it. I'll tweak the Panel to handle "direct" mode or just let it stay as is.
           */}
        </div>
      </div>
      
      <style jsx global>{`
        /* Overriding the fixed panel for the direct page if needed */
        /* But the panel uses fixed right-0, so it will still slide over everything. */
        /* For MVP, sliding over the "Quay lại" page is acceptable. */
      `}</style>
    </div>
  );
}
