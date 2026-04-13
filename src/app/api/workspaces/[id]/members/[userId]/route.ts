import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import z from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["Admin", "Manager", "Member"]),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string; userId: string }> }) {
  const params = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, userId: targetUserId } = params;
    const body = await req.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
    }

    const { role } = result.data;
    const prisma = getPrisma();

    // Verify invoker is Admin
    const invokerMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!invokerMembership || invokerMembership.role !== "Admin") {
      return NextResponse.json({ success: false, error: "Chỉ Admin mới có quyền đổi role" }, { status: 403 });
    }

    // Check if target user is inside workspace
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ success: false, error: "User không thuộc workspace" }, { status: 404 });
    }
    
    if (targetMembership.role === "Admin" && role !== "Admin") {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspace_id: workspaceId, role: "Admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, error: "Không thể hạ cấp Admin duy nhất của workspace." }, { status: 400 });
      }
    }

    await prisma.workspaceMember.update({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
      data: { role },
    });

    return NextResponse.json({ success: true, data: { message: "Cập nhật role thành công" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string; userId: string }> }) {
  const params = await props.params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, userId: targetUserId } = params;
    const prisma = getPrisma();

    // Verify invoker is Admin
    const invokerMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!invokerMembership || invokerMembership.role !== "Admin") {
      return NextResponse.json({ success: false, error: "Chỉ Admin mới có quyền xóa thành viên" }, { status: 403 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ success: false, error: "Bạn không thể tự rời workspace." }, { status: 400 });
    }

    // Check if target user is inside workspace
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ success: false, error: "User không thuộc workspace" }, { status: 404 });
    }

    // Last Admin logic
    if (targetMembership.role === "Admin") {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspace_id: workspaceId, role: "Admin" },
      });
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, error: "Không thể xóa Admin duy nhất của workspace." }, { status: 400 });
      }
    }

    await prisma.workspaceMember.delete({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
    });

    return NextResponse.json({ success: true, data: { message: "Đã xóa thành viên" } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
