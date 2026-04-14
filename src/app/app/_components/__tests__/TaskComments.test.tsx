import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock apiFetch
vi.mock("@/lib/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/apiFetch";
import { TaskComments } from "../TaskComments";

const MOCK_COMMENTS = [
  {
    id: "cmt-1",
    content: "First comment",
    created_at: new Date().toISOString(),
    user: { id: "user-1", name: "Alice", email: "alice@test.com" },
  },
];

const MOCK_MEMBERS = [
  { id: "user-1", name: "Alice" },
  { id: "user-2", name: "Bob" },
];

describe("TaskComments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("render comments thành công khi load", async () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/tasks/task-1/comments")) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: MOCK_COMMENTS }),
        });
      }
      return Promise.reject();
    });

    render(
      <TaskComments
        taskId="task-1"
        currentUserId="user-1"
        members={MOCK_MEMBERS}
        onCommentsChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("First comment")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("submit comment mới và optimistic UI update", async () => {
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/tasks/task-1/comments")) {
        if (options?.method === "POST") {
          return Promise.resolve({
            json: () => Promise.resolve({
              success: true,
              data: {
                id: "cmt-2",
                content: "Optimistic comment",
                created_at: new Date().toISOString(),
                user: { id: "user-1", name: "Alice", email: "alice@test.com" }
              }
            }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.reject();
    });

    const mockOnChanged = vi.fn();
    render(
      <TaskComments
        taskId="task-1"
        currentUserId="user-1"
        members={MOCK_MEMBERS}
        onCommentsChanged={mockOnChanged}
      />
    );

    // Chờ load rỗng
    await waitFor(() => {
      expect(screen.getByText(/Chưa có comment nào/i)).toBeInTheDocument();
    });

    // Nhập text
    const input = screen.getByPlaceholderText(/Viết bình luận/i);
    await userEvent.type(input, "Optimistic comment");
    
    // Bấm nút gửi
    const submitBtn = screen.getByRole("button", { name: /Gửi bình luận/i });
    await userEvent.click(submitBtn);

    // Kiểm tra UI cập nhật ngay (optimistic) -> "Thao tác..." hoặc comment mới
    await waitFor(() => {
      expect(screen.getByText("Optimistic comment")).toBeInTheDocument();
    });

    // Verify callback re-fetch event fired after success
    await waitFor(() => {
      expect(mockOnChanged).toHaveBeenCalled();
    });
  });

  it("rollback nếu API submit fail", async () => {
    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          json: () => Promise.resolve({ success: false, error: "Mock error" }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });

    render(
      <TaskComments
        taskId="task-1"
        currentUserId="user-1"
        members={MOCK_MEMBERS}
        onCommentsChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chưa có comment nào/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Viết bình luận/i);
    await userEvent.type(input, "Fail comment");
    const submitBtn = screen.getByRole("button", { name: /Gửi bình luận/i });
    await userEvent.click(submitBtn);

    // Expect lỗi xuất hiện và text được giữ nguyên trong ô input
    await waitFor(() => {
      expect(screen.getByText("Mock error")).toBeInTheDocument();
      expect(input).toHaveValue("Fail comment");
    });
  });

  it("hiển thị dropdown mention khi gõ @", async () => {
    (apiFetch as any).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    render(
      <TaskComments
        taskId="task-1"
        currentUserId="user-1"
        members={MOCK_MEMBERS}
        onCommentsChanged={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Viết bình luận/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Viết bình luận/i);
    await userEvent.type(input, "Hello @");
    
    // Expect dropdown xuất hiện
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Chọn Bob
    await userEvent.click(screen.getByText("Bob"));

    // Expect input value tự cập nhật
    expect(input).toHaveValue("Hello @Bob ");
  });
});
