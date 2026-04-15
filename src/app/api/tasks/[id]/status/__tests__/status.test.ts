/**
 * Unit tests — PATCH /api/tasks/:id/status
 *
 * Chiến lược mock:
 *  - Mock toàn bộ @/lib/session  → getAuthUser()
 *  - Mock toàn bộ @/lib/prisma   → getPrisma()
 *  - Mock next/headers            → cookies()
 *  - Gọi trực tiếp handler PATCH được import từ route.ts
 *
 * Các trường hợp test (theo yêu cầu FR-05 + edge cases PRD 10.1):
 *  1. Assignee update thành công → 200, activity_log được ghi
 *  2. Manager update thành công  → 200
 *  3. Member không phải assignee → 403
 *  4. Invalid status string       → 400
 *  5. Task không tồn tại         → 404
 *  6. Task đã bị soft-delete     → 400 (phân biệt với 404)
 *  7. Status giống hiện tại      → 200, updated=false, KHÔNG ghi log
 *  8. Task thuộc project archive  → vẫn update 200 (PRD 10.1)
 *  9. Task overdue               → vẫn update 200 (PRD 10.1)
 * 10. Concurrent updates         → mỗi request ghi 1 log riêng (last-write-wins)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/headers
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
import { PATCH } from "../route";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/tasks/task-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeProps(id = "task-1") {
  return { params: Promise.resolve({ id }) };
}

/** Helper: tạo mock Prisma client */
function makePrisma(overrides: Partial<{
  task: any;
  membership: any;
  activityLogCreate: any;
  taskUpdate: any;
}> = {}) {
  const transactionMock = vi.fn(async (fn: any) => {
    const tx = {
      task: {
        update: overrides.taskUpdate ?? vi.fn().mockResolvedValue({
          id: "task-1",
          status: "InProgress",
          updated_at: new Date(),
          assignee_id: "user-assignee",
          workspace_id: "ws-1",
        }),
      },
      activityLog: {
        create: overrides.activityLogCreate ?? vi.fn().mockResolvedValue({}),
      },
    };
    return fn(tx);
  });

  return {
    workspaceMember: {
      findUnique: vi.fn().mockResolvedValue(overrides.membership ?? {
        workspace_id: "ws-1",
        user_id: "user-assignee",
        role: "Member",
      }),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue(overrides.task !== undefined ? overrides.task : {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",
        workspace_id: "ws-1",
        deleted_at: null,
      }),
    },
    $transaction: transactionMock,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();

  // Default: resolveActiveWorkspace uses the mocked Prisma to find the role
  (resolveActiveWorkspace as any).mockImplementation(async (userId: string) => {
    const prisma = getPrisma();
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: "ws-1",
          user_id: userId,
        },
      },
    });
    if (!membership) return null;
    return { id: membership.workspace_id, role: membership.role };
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PATCH /api/tasks/:id/status", () => {

  // ── 1. Assignee update thành công ─────────────────────────────────────────
  it("1. Assignee update thành công → 200, activity_log được ghi", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    const logCreate = vi.fn().mockResolvedValue({});
    (getPrisma as any).mockReturnValue(makePrisma({ activityLogCreate: logCreate }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("InProgress");
    expect(body.data.updated).toBe(true);
    expect(logCreate).toHaveBeenCalledOnce();
    expect(logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action_type: "StatusChange",
          field_changed: "status",
          old_value: "ToDo",
          new_value: "InProgress",
          user_id: "user-assignee",
        }),
      })
    );
  });

  // ── 2. Manager update thành công ──────────────────────────────────────────
  it("2. Manager update thành công → 200", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-manager", name: "Minh", email: "minh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      membership: { workspace_id: "ws-1", user_id: "user-manager", role: "Manager" },
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "someone-else",  // không phải manager
        workspace_id: "ws-1",
        deleted_at: null,
      },
    }));

    const res = await PATCH(makeRequest({ status: "Done" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  // ── 3. Member không phải assignee → 403 ──────────────────────────────────
  it("3. Member không phải assignee → 403", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-other", name: "Khác", email: "other@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      membership: { workspace_id: "ws-1", user_id: "user-other", role: "Member" },
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",  // khác user đang thực hiện
        workspace_id: "ws-1",
        deleted_at: null,
      },
    }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain("assignee");
  });

  // ── 4. Invalid status → 400 ───────────────────────────────────────────────
  it("4. Status không hợp lệ → 400", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma());

    const res = await PATCH(makeRequest({ status: "invalid-status" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  // ── 5. Task không tồn tại → 404 ──────────────────────────────────────────
  it("5. Task không tồn tại → 404", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({ task: null }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps("non-existent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toContain("không tồn tại");
  });

  // ── 6. Task đã bị soft-delete → 400 (không phải 404) ─────────────────────
  it("6. Task đã bị soft-delete → 400 với message khác 404", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",
        workspace_id: "ws-1",
        deleted_at: new Date("2026-01-01"), // đã bị xóa
      },
    }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("xóa");
  });

  // ── 7. Status giống hiện tại → 200, không ghi log ────────────────────────
  it("7. Status giống hiện tại → 200, updated=false, KHÔNG ghi log", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    const logCreate = vi.fn().mockResolvedValue({});
    const transactionSpy = vi.fn();
    const prismaMock = makePrisma({ activityLogCreate: logCreate });
    prismaMock.$transaction = transactionSpy;
    (getPrisma as any).mockReturnValue(prismaMock);

    // Task đang ở ToDo, gửi status="ToDo" → no-op
    const res = await PATCH(makeRequest({ status: "ToDo" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.updated).toBe(false);
    // Transaction không được gọi → không ghi log
    expect(transactionSpy).not.toHaveBeenCalled();
    expect(logCreate).not.toHaveBeenCalled();
  });

  // ── 8. Task thuộc project đã archive → vẫn update được (PRD 10.1) ─────────
  it("8. Task trong project archived → vẫn update thành công (PRD 10.1)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    // Project archived không ảnh hưởng đến status update
    (getPrisma as any).mockReturnValue(makePrisma({
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",
        workspace_id: "ws-1",
        deleted_at: null,
        // project.archived_at không được check trong endpoint này
      },
    }));

    const res = await PATCH(makeRequest({ status: "Done" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.updated).toBe(true);
  });

  // ── 9. Task overdue → vẫn update bình thường (PRD 10.1) ──────────────────
  it("9. Task overdue → vẫn update bình thường (PRD 10.1)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",
        workspace_id: "ws-1",
        deleted_at: null,
        due_date: new Date("2020-01-01"), // quá khứ → overdue
      },
    }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  // ── 10. Concurrent updates → mỗi call ghi 1 activity_log riêng ────────────
  it("10. Concurrent updates → mỗi request ghi activity_log riêng (last-write-wins)", async () => {
    // Giả lập 2 request đồng thời từ 2 users khác nhau (Manager + Assignee)
    (getAuthUser as any)
      .mockResolvedValueOnce({ id: "user-assignee", name: "Linh", email: "linh@test.com" })
      .mockResolvedValueOnce({ id: "user-manager", name: "Minh", email: "minh@test.com" });

    const logCreate1 = vi.fn().mockResolvedValue({});
    const logCreate2 = vi.fn().mockResolvedValue({});

    const prisma1 = makePrisma({ activityLogCreate: logCreate1 });
    const prisma2 = makePrisma({
      membership: { workspace_id: "ws-1", user_id: "user-manager", role: "Manager" },
      activityLogCreate: logCreate2,
      task: {
        id: "task-1",
        status: "InProgress", // trước đó đã update sang InProgress
        assignee_id: "user-assignee",
        workspace_id: "ws-1",
        deleted_at: null,
      },
    });

    (getPrisma as any).mockReturnValue(prisma1);
    const res1 = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body1 = await res1.json();

    // Thay mock thành return prisma2 cho request thứ hai
    (getAuthUser as any).mockResolvedValueOnce({ id: "user-manager", name: "Minh", email: "minh@test.com" });
    (getPrisma as any).mockReturnValue(prisma2);
    const res2 = await PATCH(makeRequest({ status: "Done" }), makeProps());
    const body2 = await res2.json();

    // Cả hai đều thành công (last-write-wins)
    expect(body1.success).toBe(true);
    expect(body2.success).toBe(true);

    // Mỗi request ghi log riêng
    expect(logCreate1).toHaveBeenCalledOnce();
    expect(logCreate2).toHaveBeenCalledOnce();

    // Log từ request 2 ghi đúng old_value (InProgress) → new_value (Done)
    expect(logCreate2).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          old_value: "InProgress",
          new_value: "Done",
        }),
      })
    );
  });

  // ── Bonus: Không có auth → 401 ────────────────────────────────────────────
  it("Bonus: Không có auth token → 401", async () => {
    (getAuthUser as any).mockResolvedValue(null);
    (getPrisma as any).mockReturnValue(makePrisma());

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  // ── Bonus: Task thuộc workspace khác → 403 ────────────────────────────────
  it("Bonus: Task thuộc workspace khác → 403", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-assignee", name: "Linh", email: "linh@test.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      task: {
        id: "task-1",
        status: "ToDo",
        assignee_id: "user-assignee",
        workspace_id: "ws-KHÁC",   // workspace khác với cookie
        deleted_at: null,
      },
    }));

    const res = await PATCH(makeRequest({ status: "InProgress" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
