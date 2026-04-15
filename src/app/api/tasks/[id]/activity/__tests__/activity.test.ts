import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock @/lib/workspace
vi.mock("@/lib/workspace", () => ({
  resolveActiveWorkspace: vi.fn(),
}));

// Mock user session
vi.mock("@/lib/session", () => ({
  getAuthUser: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/workspace";
import { GET } from "../route";

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/tasks/task-1/activity");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

function makeProps(id = "task-1") {
  return { params: Promise.resolve({ id }) };
}

function makePrisma(overrides: any = {}) {
  return {
    workspaceMember: {
      findUnique: vi.fn().mockResolvedValue(
        "membership" in overrides ? overrides.membership : {
          workspace_id: "ws-1",
          user_id: "user-1",
          role: "Member",
        }
      ),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.task !== undefined
          ? overrides.task
          : {
              id: "task-1",
              workspace_id: "ws-1",
              deleted_at: null,
            }
      ),
    },
    activityLog: {
      findMany:
        overrides.activityLogFindMany ??
        vi.fn().mockResolvedValue([]),
      count:
        overrides.activityLogCount ??
        vi.fn().mockResolvedValue(0),
    },
  };
}

const MOCK_USER = { id: "user-1", name: "Alice", email: "a@a.com" };

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

// ─── GET /api/tasks/:id/activity ─────────────────────────────────────────────

describe("GET /api/tasks/:id/activity", () => {
  it("trả về danh sách activity logs mới nhất → cũ nhất (200)", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);

    const logs = [
      {
        id: "log-2",
        task_id: "task-1",
        action_type: "StatusChange",
        field_changed: "status",
        old_value: "ToDo",
        new_value: "InProgress",
        created_at: new Date("2026-04-15T10:00:00Z"),
        user: { id: "user-1", name: "Alice", workspace_members: [{ id: "wm-1" }] },
      },
      {
        id: "log-1",
        task_id: "task-1",
        action_type: "Create",
        field_changed: null,
        old_value: null,
        new_value: "Test task",
        created_at: new Date("2026-04-15T09:00:00Z"),
        user: { id: "user-1", name: "Alice", workspace_members: [{ id: "wm-1" }] },
      },
    ];

    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue(logs),
        activityLogCount: vi.fn().mockResolvedValue(2),
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe("log-2");
    expect(body.data[0].action_type).toBe("StatusChange");
    expect(body.data[1].id).toBe("log-1");
    expect(body.data[1].action_type).toBe("Create");
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.hasMore).toBe(false);
  });

  it("trả về pagination info (page, limit, total, hasMore)", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);

    const logs = Array.from({ length: 20 }, (_, i) => ({
      id: `log-${i}`,
      task_id: "task-1",
      action_type: "Update",
      field_changed: "title",
      old_value: `old-${i}`,
      new_value: `new-${i}`,
      created_at: new Date(),
      user: { id: "user-1", name: "Alice", workspace_members: [{ id: "wm-1" }] },
    }));

    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue(logs),
        activityLogCount: vi.fn().mockResolvedValue(45),
      })
    );

    const res = await GET(makeRequest({ page: "1", limit: "20" }), makeProps());
    const body = await res.json();

    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.total).toBe(45);
    expect(body.pagination.totalPages).toBe(3);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("fail 404 khi task không tồn tại", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    (getPrisma as any).mockReturnValue(makePrisma({ task: null }));

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Task không tồn tại");
  });

  it("fail 403 khi user không thuộc workspace", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    (getPrisma as any).mockReturnValue(
      makePrisma({ membership: null })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Không có quyền truy cập");
  });

  it("fail 403 khi task thuộc workspace khác", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    (getPrisma as any).mockReturnValue(
      makePrisma({
        task: { id: "task-1", workspace_id: "ws-other", deleted_at: null },
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Không có quyền truy cập");
  });

  it("fail 401 khi chưa đăng nhập", async () => {
    (getAuthUser as any).mockResolvedValue(null);

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  // ─── Edge cases ────────────────────────────────────────────────────────

  it("hiển thị [Removed User] khi user bị xóa khỏi workspace", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);

    const logs = [
      {
        id: "log-1",
        task_id: "task-1",
        action_type: "Update",
        field_changed: "title",
        old_value: "Old Title",
        new_value: "New Title",
        created_at: new Date(),
        user: {
          id: "user-removed",
          name: "Removed Person",
          workspace_members: [], // no workspace membership = removed
        },
      },
    ];

    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue(logs),
        activityLogCount: vi.fn().mockResolvedValue(1),
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].user.name).toBe("[Removed User]");
  });

  it("hiển thị null → value change đúng format", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);

    const logs = [
      {
        id: "log-1",
        task_id: "task-1",
        action_type: "Update",
        field_changed: "description",
        old_value: null,
        new_value: "Added description",
        created_at: new Date(),
        user: { id: "user-1", name: "Alice", workspace_members: [{ id: "wm-1" }] },
      },
    ];

    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue(logs),
        activityLogCount: vi.fn().mockResolvedValue(1),
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(body.data[0].old_value).toBeNull();
    expect(body.data[0].new_value).toBe("Added description");
  });

  it("concurrent update → tạo 2 log entries riêng biệt", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);

    const logs = [
      {
        id: "log-2",
        task_id: "task-1",
        action_type: "Update",
        field_changed: "title",
        old_value: "Title A",
        new_value: "Title C",
        created_at: new Date("2026-04-15T10:00:01Z"),
        user: { id: "user-2", name: "Bob", workspace_members: [{ id: "wm-2" }] },
      },
      {
        id: "log-1",
        task_id: "task-1",
        action_type: "Update",
        field_changed: "title",
        old_value: "Title A",
        new_value: "Title B",
        created_at: new Date("2026-04-15T10:00:00Z"),
        user: { id: "user-1", name: "Alice", workspace_members: [{ id: "wm-1" }] },
      },
    ];

    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue(logs),
        activityLogCount: vi.fn().mockResolvedValue(2),
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(body.data).toHaveLength(2);
    // Both users' changes are captured (last-write-wins, but both logged)
    expect(body.data[0].user.name).toBe("Bob");
    expect(body.data[1].user.name).toBe("Alice");
  });

  it("empty state khi chưa có activity nào", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: vi.fn().mockResolvedValue([]),
        activityLogCount: vi.fn().mockResolvedValue(0),
      })
    );

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("default pagination: page=1, limit=20", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    const findManyMock = vi.fn().mockResolvedValue([]);
    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: findManyMock,
        activityLogCount: vi.fn().mockResolvedValue(0),
      })
    );

    await GET(makeRequest(), makeProps());

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { created_at: "desc" },
      })
    );
  });

  it("respects custom page and limit params", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    const findManyMock = vi.fn().mockResolvedValue([]);
    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: findManyMock,
        activityLogCount: vi.fn().mockResolvedValue(0),
      })
    );

    await GET(makeRequest({ page: "3", limit: "10" }), makeProps());

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (3-1) * 10
        take: 10,
      })
    );
  });

  it("limit max 100, ignores limit > 100", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    const findManyMock = vi.fn().mockResolvedValue([]);
    (getPrisma as any).mockReturnValue(
      makePrisma({
        activityLogFindMany: findManyMock,
        activityLogCount: vi.fn().mockResolvedValue(0),
      })
    );

    // limit=200 should fall back to default 20 (because zod validation fails)
    await GET(makeRequest({ limit: "200" }), makeProps());

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20, // falls back to default because 200 > 100
      })
    );
  });

  it("handle 500 error gracefully", async () => {
    (getAuthUser as any).mockResolvedValue(MOCK_USER);
    (getPrisma as any).mockReturnValue({
      workspaceMember: {
        findUnique: vi.fn().mockRejectedValue(new Error("DB connection failed")),
      },
    });

    const res = await GET(makeRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("DB connection failed");
  });
});
