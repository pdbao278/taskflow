import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSummary } from "../summary/route";
import { GET as getWeekly } from "../weekly-completed/route";
import { GET as getMember } from "../member/[memberId]/route";

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

import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";

// ──────────────────────────────────────────────
// Mock fn references
// ──────────────────────────────────────────────
const mockWsMemberFindMany = vi.fn();
const mockWsMemberFindUnique = vi.fn();
const mockTaskFindMany = vi.fn();

// resolveActiveWorkspace (workspace.ts) calls workspaceMember.findMany — not findUnique.
// We use mockResolvedValueOnce to chain:
//   1st call → workspace membership (for resolveActiveWorkspace)
//   2nd call → workspace members list (for summary query)

function setupPrisma() {
  (getPrisma as any).mockReturnValue({
    workspaceMember: {
      findMany: mockWsMemberFindMany,
      findUnique: mockWsMemberFindUnique,
    },
    task: {
      findMany: mockTaskFindMany,
    },
  });
}

// ──────────────────────────────────────────────
// Auth user helpers
// ──────────────────────────────────────────────
function asManager() {
  (getAuthUser as any).mockResolvedValue({ id: "manager-1" });
}
function asAdmin() {
  (getAuthUser as any).mockResolvedValue({ id: "admin-1" });
}
function asMember() {
  (getAuthUser as any).mockResolvedValue({ id: "member-1" });
}

// resolveActiveWorkspace returns the first findMany result
const wsManagerMembership = [{ workspace_id: "ws-1", role: "Manager" }];
const wsAdminMembership   = [{ workspace_id: "ws-1", role: "Admin" }];
const wsMemberMembership  = [{ workspace_id: "ws-1", role: "Member" }];

function makeRequest(url = "http://localhost") {
  return new NextRequest(url);
}

const now = new Date();
const pastDate   = new Date(now.getTime() - 86400000 * 2);  // 2 days ago
const futureDate = new Date(now.getTime() + 86400000 * 5);  // 5 days ahead

// ══════════════════════════════════════════════
// GET /api/reports/summary
// ══════════════════════════════════════════════
describe("GET /api/reports/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrisma();
  });

  it("1. Trả về 401 nếu chưa đăng nhập", async () => {
    (getAuthUser as any).mockResolvedValue(null);
    const res = await getSummary();
    expect(res.status).toBe(401);
    expect((await res.json()).success).toBe(false);
  });

  it("2. Member bị block — 403 (FR-11 authorization)", async () => {
    asMember();
    // resolveActiveWorkspace: 1 findMany call
    mockWsMemberFindMany.mockResolvedValueOnce(wsMemberMembership);

    const res = await getSummary();
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toBe("Không có quyền truy cập");
  });

  it("3. Lấy summary thành công — trả đúng format", async () => {
    asManager();
    // 1st findMany → resolveActiveWorkspace
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    // 2nd findMany → members list
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-1", user: { id: "u-1", name: "Alice", email: "alice@x.com" }, created_at: now },
      { user_id: "u-2", user: { id: "u-2", name: "Bob",   email: "bob@x.com"   }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([
      { id: "t-1", assignee_id: "u-1", status: "Done",       due_date: futureDate },
      { id: "t-2", assignee_id: "u-1", status: "ToDo",       due_date: pastDate   },
      { id: "t-3", assignee_id: "u-1", status: "InProgress", due_date: futureDate },
      { id: "t-4", assignee_id: "u-2", status: "ToDo",       due_date: null       },
    ]);

    const res = await getSummary();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.members).toHaveLength(2);
  });

  it("4. Member stats tính đúng (Assigned=3, Completed=1, Overdue=1)", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-1", user: { id: "u-1", name: "Alice", email: "a@x.com" }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([
      { id: "t-1", assignee_id: "u-1", status: "Done",       due_date: futureDate },
      { id: "t-2", assignee_id: "u-1", status: "ToDo",       due_date: pastDate   }, // overdue
      { id: "t-3", assignee_id: "u-1", status: "InProgress", due_date: futureDate },
    ]);

    const res = await getSummary();
    const alice = (await res.json()).data.members[0];

    expect(alice.assigned).toBe(3);
    expect(alice.completed).toBe(1);
    expect(alice.overdue).toBe(1);
    expect(alice.completion_rate).toBe(33); // Math.round(1/3*100)
  });

  it("5. Completion rate = 0 khi assigned = 0 (tránh chia 0)", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-new", user: { id: "u-new", name: "New", email: "n@x.com" }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([]); // không có task nào

    const res = await getSummary();
    const member = (await res.json()).data.members[0];
    expect(member.assigned).toBe(0);
    expect(member.completion_rate).toBe(0);
  });

  it("6. Task overdue nhưng Done → không tính overdue (PRD section 10)", async () => {
    asAdmin();
    mockWsMemberFindMany.mockResolvedValueOnce(wsAdminMembership);
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-1", user: { id: "u-1", name: "Alice", email: "a@x.com" }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([
      // status=Done + due_date quá hạn → KHÔNG tính overdue
      { id: "t-1", assignee_id: "u-1", status: "Done", due_date: pastDate },
    ]);

    const res = await getSummary();
    const alice = (await res.json()).data.members[0];
    expect(alice.overdue).toBe(0);
    expect(alice.completed).toBe(1);
  });

  it("7. Workspace không có task → members trả về stats = 0 (empty state)", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-1", user: { id: "u-1", name: "Alice", email: "a@x.com" }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([]);

    const res = await getSummary();
    const body = await res.json();
    expect(res.status).toBe(200);
    const alice = body.data.members[0];
    expect(alice.assigned).toBe(0);
    expect(alice.overdue).toBe(0);
    expect(alice.completion_rate).toBe(0);
  });

  it("8. Workspace isolation — task query chứa đúng workspace_id", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockWsMemberFindMany.mockResolvedValueOnce([
      { user_id: "u-1", user: { id: "u-1", name: "Alice", email: "a@x.com" }, created_at: now },
    ]);
    mockTaskFindMany.mockResolvedValueOnce([]);

    await getSummary();

    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspace_id: "ws-1",
          deleted_at: null,
        }),
      })
    );
  });
});

// ══════════════════════════════════════════════
// GET /api/reports/weekly-completed
// ══════════════════════════════════════════════
describe("GET /api/reports/weekly-completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrisma();
  });

  it("9. Member bị block — 403", async () => {
    asMember();
    mockWsMemberFindMany.mockResolvedValueOnce(wsMemberMembership);

    const res = await getWeekly();
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("10. Trả về đúng 4 tuần, fill 0 nếu không có task", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockTaskFindMany.mockResolvedValueOnce([]);

    const res = await getWeekly();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.weeks).toHaveLength(4);
    body.data.weeks.forEach((w: any) => {
      expect(w).toHaveProperty("week");
      expect(w).toHaveProperty("label");
      expect(typeof w.count).toBe("number");
      expect(w.count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ══════════════════════════════════════════════
// GET /api/reports/member/:memberId
// ══════════════════════════════════════════════
describe("GET /api/reports/member/:memberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPrisma as any).mockReturnValue({
      workspaceMember: {
        findMany:  mockWsMemberFindMany,
        findUnique: mockWsMemberFindUnique,
      },
      task: { findMany: mockTaskFindMany },
    });
  });

  const buildProps = (memberId: string) =>
    ({ params: Promise.resolve({ memberId }) } as any);

  it("11. Assignee bị remove khỏi workspace → 404", async () => {
    asManager();
    // resolveActiveWorkspace: findMany
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    // validate memberId: findUnique → null (not in workspace)
    mockWsMemberFindUnique.mockResolvedValueOnce(null);

    const res = await getMember(makeRequest(), buildProps("removed-user"));
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("Thành viên không thuộc workspace này");
  });

  it("12. Member hợp lệ → trả đúng stats", async () => {
    asManager();
    mockWsMemberFindMany.mockResolvedValueOnce(wsManagerMembership);
    mockWsMemberFindUnique.mockResolvedValueOnce({
      user_id: "u-1",
      role: "Member",
      user: { id: "u-1", name: "Alice", email: "alice@x.com" },
    });
    mockTaskFindMany.mockResolvedValueOnce([
      { id: "t-1", assignee_id: "u-1", status: "Done", due_date: null,     title: "T1", priority: "High", project: { id: "p-1", name: "P", color: "#000" } },
      { id: "t-2", assignee_id: "u-1", status: "ToDo", due_date: pastDate, title: "T2", priority: "Low",  project: { id: "p-1", name: "P", color: "#000" } },
    ]);

    const res = await getMember(makeRequest(), buildProps("u-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.stats.assigned).toBe(2);
    expect(body.data.stats.completed).toBe(1);
    expect(body.data.stats.overdue).toBe(1);     // t-2 quá hạn và chưa Done
    expect(body.data.stats.completion_rate).toBe(50);
  });
});
