"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn, type TaskStatus } from "./KanbanColumn";
import { TaskCard, type TaskItem } from "../TaskCard";

const STATUS_COLUMNS: {
  id: TaskStatus;
  label: string;
  dotColor: string;
}[] = [
  { id: "ToDo",       label: "To Do",      dotColor: "bg-zinc-400" },
  { id: "InProgress", label: "In Progress", dotColor: "bg-blue-400" },
  { id: "InReview",   label: "In Review",   dotColor: "bg-purple-400" },
  { id: "Done",       label: "Done",        dotColor: "bg-emerald-400" },
];

export interface SharedKanbanBoardProps {
  tasks: TaskItem[];
  currentUserId: string;
  currentUserRole: string;
  isLoading: boolean;
  canMutate?: boolean; // Tắt nút cộng nếu không có quyền chung (như bị archived)
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function SharedKanbanBoard({
  tasks,
  currentUserId,
  currentUserRole,
  isLoading,
  canMutate,
  onTaskClick,
  onStatusChange,
  onAddTask,
  onDragStateChange,
}: SharedKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    onDragStateChange?.(true);
    const task = event.active.data.current?.task as TaskItem | undefined;
    if (task) setActiveTask(task);
  }, [onDragStateChange]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      onDragStateChange?.(false);
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      let overId = over.id as string;

      // Nếu overId không phải là status hợp lệ, có nghĩa là chúng ta đang thả đè lên một Task khác.
      // Chúng ta cần tìm xem Task đó thuộc cột nào.
      const validStatuses: TaskStatus[] = ["ToDo", "InProgress", "InReview", "Done"];
      let targetStatus: TaskStatus | undefined;

      if (validStatuses.includes(overId as TaskStatus)) {
        targetStatus = overId as TaskStatus;
      } else {
        // Tìm task bị đè lên
        const overTask = tasks.find(t => t.id === overId);
        if (overTask) {
          targetStatus = overTask.status as TaskStatus;
        }
      }

      if (!targetStatus) return;

      // Nếu status không đổi thì không cần gọi API (tránh gọi nhầm khi kéo trong cùng 1 cột)
      const activeTask = tasks.find(t => t.id === taskId);
      if (activeTask && activeTask.status === targetStatus) return;

      onStatusChange(taskId, targetStatus);
    },
    [onStatusChange, onDragStateChange, tasks]
  );

  const handleDragCancel = useCallback(() => {
    onDragStateChange?.(false);
    setActiveTask(null);
  }, [onDragStateChange]);

  const [overId, setOverId] = useState<string | null>(null);

  const isManagerOrAdmin = currentUserRole === "Manager" || currentUserRole === "Admin";
  const canShowAdd = canMutate !== undefined ? canMutate : true; // Default to true for Manager/Member (FR-04)

  // Xác định cột mục tiêu dựa trên overId
  const getActiveOverColumnId = (): TaskStatus | null => {
    if (!overId) return null;
    const validStatuses: TaskStatus[] = ["ToDo", "InProgress", "InReview", "Done"];
    if (validStatuses.includes(overId as TaskStatus)) return overId as TaskStatus;
    
    const overTask = tasks.find(t => t.id === overId);
    return overTask ? (overTask.status as TaskStatus) : null;
  };

  const activeOverColumnId = getActiveOverColumnId();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={(event) => setOverId(event.over?.id as string || null)}
      onDragEnd={(event) => {
        setOverId(null);
        handleDragEnd(event);
      }}
      onDragCancel={(event) => {
        setOverId(null);
        handleDragCancel();
      }}
    >
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-24 overflow-x-auto snap-x snap-mandatory pt-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink-1">
              <KanbanColumn
                id={col.id}
                label={col.label}
                dotColor={col.dotColor}
                tasks={columnTasks}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onTaskClick={onTaskClick}
                onStatusChange={onStatusChange}
                onAddTask={canShowAdd && onAddTask ? () => onAddTask(col.id) : undefined}
                isLoading={isLoading}
                isDragActive={!!activeTask}
                isOverColumn={activeOverColumnId === col.id}
              />
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-2 scale-105 shadow-2xl ring-2 ring-blue-400/60 rounded-xl opacity-95">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
