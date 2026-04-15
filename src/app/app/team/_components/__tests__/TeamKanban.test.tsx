import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock apiFetch
vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiFetch";
import { TeamKanbanClient } from "../TeamKanbanClient";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS = {
  columns: {
    "To Do": [
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
      }
    ],
    "In Progress": [],
    "In Review": [],
    "Done": []
  }
};

function setupFetchMocks() {
  (apiFetch as any).mockImplementation((url: string) => {
    if (url.includes("/api/tasks/team")) {
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ success: true, data: MOCK_TASKS }),
      });
    }
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ success: true, data: [] }),
    });
  });
}

function renderWithParams(role: string, userId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamKanbanClient currentUserRole={role} currentUserId={userId} />
    </QueryClientProvider>
  );
}

describe("TeamKanbanClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("1. Render thành công và gọi API fetch tasks", async () => {
    setupFetchMocks();

    renderWithParams("Member", "user-assignee");

    // Chờ tasks load (flattened items displayed on kanban board)
    await waitFor(() => {
      expect(screen.getByText("Task của assignee")).toBeInTheDocument();
    });

    // Verify API được gọi với endpoint mới /api/tasks/team
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("/api/tasks/team"));
  });
  
  it("2. Manager và Member đều thấy nút Thêm Task (FR-04)", async () => {
    setupFetchMocks();
    
    // Test for Manager
    const { unmount } = renderWithParams("Manager", "user-manager");
    await waitFor(() => {
      expect(screen.getByText("Thêm Task")).toBeInTheDocument();
    });
    unmount();

    // Test for Member
    renderWithParams("Member", "user-assignee");
    // Member quyền tạo task vẫn có
    await waitFor(() => {
      expect(screen.getByText("Thêm Task")).toBeInTheDocument();
    });
  });

  it("3. Debounce search hoạt động sau 300ms", async () => {
    setupFetchMocks();
    renderWithParams("Manager", "user-manager");

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("Tìm kiếm task...");

    await user.type(searchInput, "bug");

    // Lần đầu (meta data + initial tasks)
    expect(apiFetch).toHaveBeenCalledTimes(3);

    // Chờ debounce
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=bug")
      );
    }, { timeout: 500 });
  });

  it("4. Bắt lỗi truy cập (403 hiển thị feedback)", async () => {
    // Override apiFetch to throw 403
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/tasks/team")) {
        return Promise.resolve({
          status: 403,
          json: () => Promise.resolve({ success: false, error: "Chỉ Quản lý" }),
        });
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    renderWithParams("Member", "user-assignee");

    // React query should show error state
    await waitFor(() => {
      expect(screen.getByText("Không thể truy cập dữ liệu")).toBeInTheDocument();
      expect(screen.getByText("Chỉ Quản lý mới có quyền xem Dashboard Team")).toBeInTheDocument();
    });
  });
});
