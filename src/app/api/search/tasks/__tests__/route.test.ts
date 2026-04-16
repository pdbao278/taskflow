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

vi.mock("@/lib/workspace", () => ({
  resolveActiveWorkspace: vi.fn(),
}));

import { resolveActiveWorkspace } from "@/lib/workspace";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

const mockFindManyTasks = vi.fn();

describe("GET /api/search/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (getPrisma as any).mockReturnValue({
      task: {
        findMany: mockFindManyTasks,
      },
    });
  });

  const createRequest = (url: string = "http://localhost/api/search/tasks") => {
    return new NextRequest(url);
  };

  it("1. Returns 401 if not logged in", async () => {
    (getAuthUser as any).mockResolvedValue(null);
    const req = createRequest();
    
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("2. Returns 403 if no active workspace", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (resolveActiveWorkspace as any).mockResolvedValue(null);
    
    const req = createRequest("http://localhost/api/search/tasks?q=bug");
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("3. Returns empty array if query is missing or empty", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (resolveActiveWorkspace as any).mockResolvedValue({ id: "ws-1", role: "Member" });
    
    const req = createRequest("http://localhost/api/search/tasks?q=");
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
    expect(mockFindManyTasks).not.toHaveBeenCalled();
  });

  it("4. Returns 400 if query is too long (>200)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (resolveActiveWorkspace as any).mockResolvedValue({ id: "ws-1", role: "Member" });
    
    const longQ = "a".repeat(201);
    const req = createRequest("http://localhost/api/search/tasks?q=" + longQ);
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("5. Searches tasks successfully with correct prisma params", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (resolveActiveWorkspace as any).mockResolvedValue({ id: "ws-1", role: "Member" });
    
    // mock result
    mockFindManyTasks.mockResolvedValue([
      { id: "task-1", title: "fix bug", project_id: "p1", status: "ToDo", assignee_id: null }
    ]);
    
    const req = createRequest("http://localhost/api/search/tasks?q=bug&limit=5");
    const res = await GET(req);
    const json = await res.json();
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(1);
    
    expect(mockFindManyTasks).toHaveBeenCalledWith({
      where: {
        workspace_id: "ws-1",
        deleted_at: null,
        title: { contains: "bug", mode: "insensitive" }
      },
      take: 5,
      orderBy: { updated_at: "desc" },
      select: {
          id: true,
          title: true,
          project_id: true,
          status: true,
          assignee_id: true
        }
    });
  });
});
