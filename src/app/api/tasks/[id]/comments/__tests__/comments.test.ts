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
import { GET, POST } from "../route";

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/tasks/task-1/comments");
}

function makePostRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/tasks/task-1/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeProps(id = "task-1") {
  return { params: Promise.resolve({ id }) };
}

function makePrisma(overrides: any = {}) {
  const transactionMock = vi.fn(async (fn: any) => {
    const tx = {
      comment: {
        create: overrides.commentCreate ?? vi.fn().mockResolvedValue({ id: "cmt-1", content: "Test", task_id: "task-1", user_id: "user-1" }),
      },
      activityLog: {
        create: overrides.activityLogCreate ?? vi.fn().mockResolvedValue({}),
      },
      task: {
        findUnique: vi.fn().mockResolvedValue({ assignee_id: "user-2", title: "Test" }),
      },
      notification: {
        createMany: overrides.notificationCreateMany ?? vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return fn(tx);
  });

  return {
    workspaceMember: {
      findUnique: vi.fn().mockResolvedValue(overrides.membership ?? {
        workspace_id: "ws-1",
        user_id: "user-1",
        role: "Member",
      }),
      findMany: overrides.findManyMembers ?? vi.fn().mockResolvedValue([
        { user: { id: "user-1", name: "Alice" } },
        { user: { id: "user-2", name: "Bob" } },
      ]),
    },
    task: {
      findUnique: vi.fn().mockResolvedValue(overrides.task !== undefined ? overrides.task : {
        id: "task-1",
        workspace_id: "ws-1",
        deleted_at: null,
      }),
    },
    comment: {
      findMany: overrides.commentFindMany ?? vi.fn().mockResolvedValue([]),
    },
    $transaction: transactionMock,
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

describe("GET /api/tasks/:id/comments", () => {
  it("trả về danh sách comments thành công (200)", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1", name: "Alice", email: "a@a.com" });
    (getPrisma as any).mockReturnValue(makePrisma({
      commentFindMany: vi.fn().mockResolvedValue([{ id: "cmt-1", content: "Hello" }]),
    }));

    const res = await GET(makeGetRequest(), makeProps());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].content).toBe("Hello");
  });

  it("fail 404 nếu task không tồn tại", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (getPrisma as any).mockReturnValue(makePrisma({ task: null }));

    const res = await GET(makeGetRequest(), makeProps());
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tasks/:id/comments", () => {
  it("tạo comment thành công và tạo mention", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    const notificationCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const activityLogCreate = vi.fn().mockResolvedValue({});
    const commentCreate = vi.fn().mockResolvedValue({ id: "cmt-1", content: "Hi @Bob" });

    const prismaMock = makePrisma({ notificationCreateMany, activityLogCreate, commentCreate });
    (getPrisma as any).mockReturnValue(prismaMock);

    const res = await POST(makePostRequest({ content: "Hi @Bob" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);

    // Verify activity log creation
    expect(activityLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action_type: "Comment", field_changed: "comment_created" }),
    });

    // Verify notification creation because @Bob was mentioned
    expect(notificationCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ user_id: "user-2", type: "Mention" })],
    });
  });

  it("fail 400 nếu content trống", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    (getPrisma as any).mockReturnValue(makePrisma());

    const res = await POST(makePostRequest({ content: "   " }), makeProps());
    expect(res.status).toBe(400);
  });

  it("sanitize HTML <script> tag", async () => {
    (getAuthUser as any).mockResolvedValue({ id: "user-1" });
    const commentCreate = vi.fn().mockResolvedValue({ id: "cmt-2" });
    (getPrisma as any).mockReturnValue(makePrisma({ commentCreate }));

    const res = await POST(makePostRequest({ content: "Test <script>alert(1)</script>" }), makeProps());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(commentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Test alert(1)",
        }),
      })
    );
  });
});
