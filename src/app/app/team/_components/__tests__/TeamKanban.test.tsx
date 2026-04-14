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
  
  it("2. Manager thấy nút Thêm Task (id: btn-team-add-task), Member thì không", async () => {
    setupFetchMocks();

    const { rerender } = render(
      <TeamKanbanClient currentUserRole="Manager" currentUserId="user-manager" />
    );

    await waitFor(() => {
      expect(screen.getByText("Task của assignee")).toBeInTheDocument();
    });

    // Sử dụng test id thay vì role button vì column cũng có nút add task
    expect(screen.getByText("Thêm Task")).toBeInTheDocument();

    // Rerender with Member role
    rerender(
      <TeamKanbanClient currentUserRole="Member" currentUserId="user-assignee" />
    );

    // Ở member, trên màn sẽ KHÔNG CÓ nút text "Thêm Task" ở dạng button add 
    // vì column add button cũng được hide với Member
    expect(screen.queryByRole("button", { name: "Thêm Task" })).not.toBeInTheDocument();
  });
});
