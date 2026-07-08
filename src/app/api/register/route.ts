/**
 * POST /api/register
 * Register a new user or organisation super admin
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { z } from "zod";

const RegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  orgName:  z.string().min(2).max(100).optional(),
  orgSlug:  z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  role:     z.enum(["SUPER_ADMIN", "ENGINEER", "VIEWER"]).default("ENGINEER"),
  orgId:    z.string().optional(), // for joining existing org
});

export async function POST(req: NextRequest) {
  let body;
  try { body = RegisterSchema.parse(await req.json()); }
  catch (err: any) { return NextResponse.json({ error: "Invalid request", details: err.errors }, { status: 400 }); }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  let orgId = body.orgId ?? null;

  // If registering as SUPER_ADMIN, create the org
  if (body.role === "SUPER_ADMIN") {
    if (!body.orgName || !body.orgSlug) {
      return NextResponse.json({ error: "Organisation name and slug required for Super Admin registration." }, { status: 400 });
    }
    const existingOrg = await prisma.org.findUnique({ where: { slug: body.orgSlug } });
    if (existingOrg) {
      return NextResponse.json({ error: "Organisation slug already taken. Choose a different one." }, { status: 409 });
    }
    const org = await prisma.org.create({
      data: { name: body.orgName, slug: body.orgSlug, plan: "STARTER" },
    });
    orgId = org.id;
  }

  // Super admins are auto-approved; everyone else needs approval
  const isSuperAdmin = body.role === "SUPER_ADMIN";

  const user = await prisma.user.create({
    data: {
      name:        body.name,
      email:       body.email,
      role:        isSuperAdmin ? "SUPER_ADMIN" : "PENDING",
      orgId,
      approved:    isSuperAdmin,
      approvedAt:  isSuperAdmin ? new Date() : null,
      registeredAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      orgId,
      action: isSuperAdmin ? "user.register_super_admin" : "user.register_pending",
      outcome: "success",
      metadata: { role: body.role, email: body.email },
    },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: isSuperAdmin
      ? "Organisation and Super Admin account created. You can now sign in with Google, GitHub, or Microsoft."
      : "Registration submitted. Your account is pending approval from your organisation admin.",
    approved: isSuperAdmin,
    userId: user.id,
  }, { status: 201 });
}

// GET — check if any super admin exists for an org slug
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("org");
  if (!slug) return NextResponse.json({ error: "org slug required" }, { status: 400 });

  const org = await prisma.org.findUnique({
    where: { slug },
    include: { _count: { select: { users: true } } },
  });

  if (!org) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true, name: org.name, id: org.id, memberCount: org._count.users });
}
