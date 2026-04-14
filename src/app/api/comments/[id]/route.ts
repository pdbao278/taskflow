import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import z from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Comment không được để trống").max(2000, "Comment tối đa 2000 ký tự"),
});

function sanitizeContent(content: string): string {
  return content.replace(/<\/?[^>]+(>|$)/g, "");
}

// PATCH /api/comments/[id]
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const content = sanitizeContent(parsed.data.content);
    if (!content.trim()) {
      return NextResponse.json({ success: false, error: "Comment không được để trống" }, { status: 400 });
    }

    const prisma = getPrisma();

    // Check ownership
    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { user_id: true }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Bình luận không tồn tại" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Bạn không có quyền sửa bình luận này" }, { status: 403 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/comments/[id]
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();

    // Check ownership or moderation rights
    const existing = await prisma.comment.findUnique({
      where: { id },
      include: {
        task: {
          select: { workspace_id: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Bình luận không tồn tại" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: existing.task.workspace_id,
          user_id: user.id,
        },
      },
      select: { role: true }
    });

    const isOwner = existing.user_id === user.id;
    const isModerator = membership?.role === "Admin" || membership?.role === "Manager";

    if (!isOwner && !isModerator) {
      return NextResponse.json({ success: false, error: "Bạn không có quyền xóa bình luận này" }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
