import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock apiFetch
vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiFetch";
import { TeamKanbanClient } from "../TeamKanbanClient";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS = [
  {
    id: "task-1",
    title: "Task của assignee",
    description: null,
    status: "ToDo" as const,
    priority: "Medium" as const,
    due_date: null,
    assignee_id: "user-assignee",
    assignee: { id: "user-assignee", name: "Linh", email: "linh@test.com" },
    creator: { id: "user-manager", name: "Minh", email: "minh@test.com" },
    project: { id: "proj-1", name: "Project A", color: "#3b82f6" },
    created_at: new Date().toISOString(),
  },
];

function setupFetchMocks() {
  (apiFetch as any).mockImplementation((url: string, options?: any) => {
    if (url.includes("/api/tasks")) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: MOCK_TASKS }),
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });
}

describe("TeamKanbanClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("1. Render thành công và gọi API fetch tasks", async () => {
    setupFetchMocks();

    render(
      <TeamKanbanClient
        currentUserRole="Member"
        currentUserId="user-assignee"
      />
    );

    // Chờ tasks load
    await waitFor(() => {
      expect(screen.getByText("Task của assignee")).toBeInTheDocument();
    });

    // Verify API được gọi
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("/api/tasks"));
  });
  
  it("2. Manager và Member đều thấy nút Thêm Task (FR-04)", async () => {
    setupFetchMocks();
    
    // Test for Manager
    const { rerender } = render(
      <TeamKanbanClient currentUserRole="Manager" currentUserId="user-manager" />
    );
    await waitFor(() => {
      expect(screen.getByText("Thêm Task")).toBeInTheDocument();
    });

    // Test for Member
    rerender(
      <TeamKanbanClient currentUserRole="Member" currentUserId="user-assignee" />
    );
    // Member hiện đã có quyền tạo task và thấy nút Thêm Task (FR-04)
    expect(screen.getByText("Thêm Task")).toBeInTheDocument();
  });
});
