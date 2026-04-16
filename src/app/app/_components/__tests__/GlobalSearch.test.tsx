import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearch } from "../GlobalSearch";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GlobalSearch Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Render input correctly and debounce API call", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Tìm kiếm task...");
    
    fireEvent.change(input, { target: { value: "bug" } });
    
    // API not called immediately
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Fast-forward 300ms
    vi.advanceTimersByTime(300);
    
    // Now it should be called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/search/tasks?q=bug");
    });
  });

  it("2. Hiển thị kết quả và cho phép navigate với bàn phím (ArrowDown, Enter)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: "task-1", title: "Fix bug login", status: "ToDo", project_id: "p1" },
          { id: "task-2", title: "Bug UI header", status: "InProgress", project_id: "p1" },
        ],
      }),
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Tìm kiếm task...");
    
    fireEvent.change(input, { target: { value: "bug" } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText("Fix bug login")).toBeInTheDocument();
      expect(screen.getByText("Bug UI header")).toBeInTheDocument();
    });

    // Bấm mũi tên xuống (ArrowDown) -> select item đầu (index 0)
    fireEvent.keyDown(input, { key: "ArrowDown" });
    
    // Bấm Enter để select
    fireEvent.keyDown(input, { key: "Enter" });
    
    expect(mockPush).toHaveBeenCalledWith("/app/tasks/task-1");
  });

  it("3. Hiển thị Lỗi khi API fail", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Tìm kiếm task...");
    
    fireEvent.change(input, { target: { value: "fail" } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText("Có lỗi xảy ra. Thử lại?")).toBeInTheDocument();
    });
  });

  it("4. Hiển thị 'Không tìm thấy task' khi API trả về rỗng", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Tìm kiếm task...");
    
    fireEvent.change(input, { target: { value: "empty" } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText("Không tìm thấy task")).toBeInTheDocument();
    });
  });

  it("5. Click kết quả -> Navigate và Dropdown đóng", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: "task-99", title: "Click me", status: "Done", project_id: "p1" },
        ],
      }),
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText("Tìm kiếm task...");
    
    fireEvent.change(input, { target: { value: "click" } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(screen.getByText("Click me")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Click me"));
    expect(mockPush).toHaveBeenCalledWith("/app/tasks/task-99");
    
    // Input is cleared and closed
    expect(input).toHaveValue("");
  });
});
