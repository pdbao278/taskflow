import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock dependencies
vi.mock("@/lib/session", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn().mockImplementation((name: string) => {
      if (name === "active_workspace_id") return { value: "ws-1" };
      return undefined;
    }),
  })),
}));

vi.mock("@/lib/workspace", () => ({
  resolveActiveWorkspace: vi.fn(),
}));

import { resolveActiveWorkspace } from "@/lib/workspace";

import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

const mockFindUniqueWorkspace = vi.fn();
const mockFindManyTasks = vi.fn();

describe("GET /api/tasks/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (resolveActiveWorkspace as any).mockImplementation(async (userId: string) => {
      const membership = await mockFindUniqueWorkspace();
      if (!membership) return null;
      return { id: "ws-1", role: membership.role || "Member" };
    });

    (getPrisma as any).mockReturnValue({
      workspaceMember: {
        findUnique: mockFindUniqueWorkspace,
      },
      task: {
        findMany: mockFindManyTasks,
      },
    });
  });

  const createRequest = (url: string = "http://localhost/api/tasks/team") => {
    return new NextRequest(url);
  };

  it("1. Trả về 401 nếu chưa đăng nhập", async () => {
    (getAuthUser as any).mockResolvedValue(null);
    const req = createRequest();
    
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("2. Trả về 403 nếu user là Member (Forbidden)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    mockFindUniqueWorkspace.mockResolvedValue({ role: "Member" });
    
    const req = createRequest();
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Chỉ Quản lý mới có quyền");
  });

  it("3. Lấy task thành công và fetch đúng column format (Manager access)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "manager-1" });
    mockFindUniqueWorkspace.mockResolvedValue({ role: "Manager" });

    mockFindManyTasks.mockResolvedValue([
      { id: "task-1", status: "ToDo", title: "Task 1", due_date: "2026-05-01T00:00:00Z" },
      { id: "task-2", status: "InProgress", title: "Task 2", due_date: null },
      { id: "task-3", status: "ToDo", title: "Task 3", due_date: "2026-04-01T00:00:00Z" },
    ]);

    const req = createRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.columns).toBeDefined();
    
    // Grouped properly
    expect(json.data.columns["To Do"].length).toBe(2);
    expect(json.data.columns["In Progress"].length).toBe(1);
    expect(json.data.columns["In Review"].length).toBe(0);
    expect(json.data.columns["Done"].length).toBe(0);
  });

  it("4. Filter theo params truyền qua query (project_id, search, due_date, etc)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "manager-1" });
    mockFindUniqueWorkspace.mockResolvedValue({ role: "Manager" });
    mockFindManyTasks.mockResolvedValue([]);

    const req = createRequest("http://localhost/api/tasks/team?project_id=p-1&assignee_id=a-1&priority=High&search=bug&due_from=2026-04-01&due_to=2026-04-30");
    await GET(req);

    // Verify params sent to Prisma
    expect(mockFindManyTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspace_id: "ws-1",
          deleted_at: null,
          project_id: "p-1",
          assignee_id: "a-1",
          priority: "High",
          title: { contains: "bug", mode: "insensitive" },
          due_date: {
            gte: new Date("2026-04-01"),
            lte: new Date("2026-04-30")
          }
        })
      })
    );
  });

  it("5. Trả về đúng format tên cho assignee bị removed", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "admin-1" });
    mockFindUniqueWorkspace.mockResolvedValue({ role: "Admin" });

    // assignee_id có nhưng không có trong workspace_members nữa
    mockFindManyTasks.mockResolvedValue([
      { 
        id: "task-1", status: "ToDo", title: "Missing assignee", assignee_id: "old-user",
        assignee: { id: "old-user", name: "Old", workspace_members: [] }
      },
    ]);

    const req = createRequest();
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.columns["To Do"][0].assignee.name).toBe("[Removed User]");
  });

  it("6. API trả về format error nếu search quá dài", async () => {
    const req = createRequest("http://localhost/api/tasks/team?search=" + "a".repeat(201));
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
