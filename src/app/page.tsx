import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import DashboardClient from "../components/DashboardClient";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const userId = (session.user as any).id;
  const orgId  = (session.user as any).orgId;

  const [assets, alertCount] = await Promise.all([
    prisma.asset.findMany({
      where: { orgId: orgId ?? undefined },
      include: {
        sensors: { include: { alerts: { where: { resolved: false } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.alert.count({
      where: {
        resolved: false,
        sensor: { asset: { orgId: orgId ?? undefined } },
      },
    }),
  ]);

  return (
    <DashboardClient
      assets={assets}
      alertCount={alertCount}
      user={session.user}
    />
  );
}
