"use client";

import { useState, useCallback } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { TaskFormPanel, type CreatedTask } from "./TaskFormPanel";

interface NewTaskButtonProps {
  /** Called with the newly created task so parent can refresh lists */
  onCreated?: (task: CreatedTask) => void;
}

export function NewTaskButton({ onCreated }: NewTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleCreated = useCallback(
    (task: CreatedTask) => {
      setToastMsg("Task đã tạo thành công");
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 4000);
      onCreated?.(task);
    },
    [onCreated]
  );

  return (
    <>
      {/* Button — accessible from any page, max 3 clicks (NFR-05) */}
      <button
        id="btn-new-task-global"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 shadow-sm"
        aria-label="Tạo task mới"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Task</span>
      </button>

      {/* Slide-over form panel */}
      <TaskFormPanel
        open={open}
        onClose={() => setOpen(false)}
        onCreated={handleCreated}
      />

      {/* Global success toast (4s auto-dismiss — AGENTS.md) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toastVisible && (
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border bg-white border-emerald-200 text-emerald-700 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {toastMsg}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out; }
      `}</style>
    </>
  );
}
