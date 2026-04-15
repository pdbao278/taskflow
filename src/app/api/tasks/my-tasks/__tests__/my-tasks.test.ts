import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/headers (cookies)
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock @/lib/workspace
vi.mock("@/lib/workspace", () => ({
  resolveActiveWorkspace: vi.fn(),
}));

// Mock @/lib/session
vi.mock("@/lib/session", () => ({
  getAuthUser: vi.fn(),
}));

// Mock @/lib/prisma
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import { GET } from "../route";

// --- Helpers ---
function makeRequest(url = "http://localhost/api/tasks/my-tasks"): NextRequest {
  return new NextRequest(url, {
    method: "GET",
  });
}

function makePrisma(overrides: Partial<{ membership: any; taskFindMany: any }> = {}) {
  return {
    workspaceMember: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.membership !== undefined
          ? overrides.membership
          : { workspace_id: "ws-1", user_id: "user-1", role: "Member" }
      ),
    },
    task: {
      findMany:
        overrides.taskFindMany ||
        vi.fn().mockResolvedValue([
          { id: "task-1", status: "ToDo", assignee_id: "user-1", created_at: new Date() },
        ]),
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  (resolveActiveWorkspace as any).mockImplementation(async (userId: string) => {
    const prisma = getPrisma();
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspace_id_user_id: { workspace_id: "ws-1", user_id: userId } },
    });
    if (!membership) return null;
    return { id: membership.workspace_id, role: membership.role };
  });
});

describe("GET /api/tasks/my-tasks", () => {
  it("Lấy danh sách task thành công", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (getPrisma as any).mockReturnValue(makePrisma());

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe("task-1");
  });

  it("Filter theo status hoạt động đúng", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    const findManyMock = vi.fn().mockResolvedValue([]);
    (getPrisma as any).mockReturnValue(makePrisma({ taskFindMany: findManyMock }));

    await GET(makeRequest("http://localhost/api/tasks/my-tasks?status=InProgress"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "InProgress",
        }),
      })
    );
  });

  it("Sort đúng thứ tự: overdue -> due date -> no due date", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const findManyMock = vi.fn().mockResolvedValue([
      { id: "no-due", created_at: new Date(2020, 1, 1) },
      { id: "overdue", due_date: yesterday, created_at: new Date(2020, 1, 2) },
      { id: "upcoming", due_date: tomorrow, created_at: new Date(2020, 1, 3) },
      { id: "overdue2", due_date: new Date(yesterday.getTime() - 100000), created_at: new Date(2020,1,4) }, 
    ]);
    (getPrisma as any).mockReturnValue(makePrisma({ taskFindMany: findManyMock }));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    // Overdue first (sorted by their dates), then upcoming, then no due
    expect(body.data[0].id).toBe("overdue2");
    expect(body.data[1].id).toBe("overdue");
    expect(body.data[2].id).toBe("upcoming");
    expect(body.data[3].id).toBe("no-due");
  });

  it("Unauthorized (no token)", async () => {
    (getAuthUser as any).mockResolvedValue(null);
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("User không có task -> return []", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (getPrisma as any).mockReturnValue(makePrisma({ taskFindMany: vi.fn().mockResolvedValue([]) }));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(0); // Không phải là lỗi
  });

  it("API fail -> trả đúng format error", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (getPrisma as any).mockReturnValue({
      workspaceMember: { findUnique: vi.fn().mockRejectedValue(new Error("DB Connection Error")) },
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("DB Connection Error");
  });
});
