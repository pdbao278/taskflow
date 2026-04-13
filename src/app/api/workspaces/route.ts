import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import z from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Tên workspace không được để trống").max(100, "Tên workspace tối đa 100 ký tự"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { user_id: user.id },
        },
      },
      include: {
        members: {
          where: { user_id: user.id }
        }
      }
    });

    return NextResponse.json({ success: true, data: workspaces });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
    }

    const { name } = result.data;

    const prisma = getPrisma();

    const workspace = await prisma.workspace.create({
      data: {
        name,
        created_by: user.id,
        members: {
          create: {
            user_id: user.id,
            role: "Admin",
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: workspace });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
