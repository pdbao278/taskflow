import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { resolveActiveWorkspace } from "@/lib/workspace";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const activeWorkspace = await resolveActiveWorkspace(user.id);
    if (!activeWorkspace) {
      return NextResponse.json({ success: false, error: "No active workspace" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    let q = searchParams.get("q");
    const limitStr = searchParams.get("limit");

    if (!q) {
      return NextResponse.json({ success: true, data: [] });
    }

    q = q.trim();
    if (q.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    if (q.length > 200) {
      return NextResponse.json({ success: false, error: "Query too long" }, { status: 400 });
    }
    
    // limit max 10
    let limit = 10;
    if (limitStr) {
        const parsed = parseInt(limitStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
            limit = Math.min(parsed, 10);
        }
    }

    const prisma = getPrisma();
    
    // Search tasks where workspace_id matches, not deleted, title contains q (case-insensitive)
    const tasks = await prisma.task.findMany({
      where: {
        workspace_id: activeWorkspace.id,
        deleted_at: null,
        title: {
          contains: q,
          mode: "insensitive"
        }
      },
      take: limit,
      orderBy: {
        updated_at: "desc"
      },
      select: {
        id: true,
        title: true,
        project_id: true,
        status: true,
        assignee_id: true,
        due_date: true,
        project: {
          select: {
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error("GET /api/search/tasks Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
