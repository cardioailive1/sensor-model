/**
 * GET  /api/admin/users  — list pending/all users for org
 * PATCH /api/admin/users — approve or reject a user
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";

const ApprovalSchema = z.object({
  userId:  z.string(),
  action:  z.enum(["approve", "reject"]),
  role:    z.enum(["ENGINEER", "VIEWER", "ADMIN"]).optional(),
  reason:  z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["SUPER_ADMIN", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = (session.user as any).orgId;
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "pending"; // pending | all

  const users = await prisma.user.findMany({
    where: {
      orgId: orgId ?? undefined,
      ...(filter === "pending" ? { approved: false, deletedAt: null } : { deletedAt: null }),
    },
    select: {
      id: true, name: true, email: true, role: true,
      approved: true, approvedAt: true, rejectedAt: true,
      registeredAt: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { registeredAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminRole = (session.user as any).role;
  if (!["SUPER_ADMIN", "ADMIN"].includes(adminRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = (session.user as any).id;
  const orgId   = (session.user as any).orgId;

  let body;
  try { body = ApprovalSchema.parse(await req.json()); }
  catch (err: any) { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  // Ensure target user is in same org
  const target = await prisma.user.findFirst({
    where: { id: body.userId, orgId: orgId ?? undefined },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "approve") {
    await prisma.user.update({
      where: { id: body.userId },
      data: {
        approved:   true,
        approvedAt: new Date(),
        approvedBy: adminId,
        role:       body.role ?? "ENGINEER",
        rejectedAt: null,
      },
    });
    await prisma.auditLog.create({
      data: { userId: adminId, orgId, action: "user.approved", resourceId: body.userId, outcome: "success", metadata: { role: body.role } },
    }).catch(() => {});
    return NextResponse.json({ success: true, message: "User approved." });
  }

  if (body.action === "reject") {
    await prisma.user.update({
      where: { id: body.userId },
      data: { rejectedAt: new Date(), rejectedReason: body.reason ?? null },
    });
    await prisma.auditLog.create({
      data: { userId: adminId, orgId, action: "user.rejected", resourceId: body.userId, outcome: "success", metadata: { reason: body.reason } },
    }).catch(() => {});
    return NextResponse.json({ success: true, message: "User rejected." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
