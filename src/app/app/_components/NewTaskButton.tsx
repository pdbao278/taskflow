"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { TaskFormPanel, type CreatedTask } from "./TaskFormPanel";
import { useToastStore } from "@/lib/toast";

interface NewTaskButtonProps {
  /** Called with the newly created task so parent can refresh lists */
  onCreated?: (task: CreatedTask) => void;
}

export function NewTaskButton({ onCreated }: NewTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const { addToast } = useToastStore();

  const handleCreated = useCallback(
    (task: CreatedTask) => {
      addToast("Task đã tạo thành công", "success");
      onCreated?.(task);
    },
    [onCreated, addToast]
  );

  return (
    <>
      {/* Button — accessible from any page, max 3 clicks (NFR-05) */}
      <button
        id="btn-new-task-global"
        onClick={() => setOpen(true)}
        className="tf-btn-primary w-full"
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
    </>
  );
}
