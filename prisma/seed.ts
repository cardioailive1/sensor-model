import { PrismaClient, UserRole, OrgPlan, AlertLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SensorModel database...");

  // Default data retention policies (SOC 2 / GDPR compliant)
  const policies = [
    { dataType: "sensor_readings", retentionDays: 90, archiveAfterDays: 30, deleteAfterDays: 365 },
    { dataType: "predictions", retentionDays: 180, archiveAfterDays: 90, deleteAfterDays: 730 },
    { dataType: "audit_logs", retentionDays: 730, deleteAfterDays: 2555 }, // 7 years for compliance
    { dataType: "alerts", retentionDays: 365, deleteAfterDays: 1825 },
  ];

  for (const policy of policies) {
    await prisma.dataRetentionPolicy.upsert({
      where: { dataType: policy.dataType },
      update: policy,
      create: policy,
    });
  }

  // Demo org
  const demoOrg = await prisma.org.upsert({
    where: { slug: "corverxis-demo" },
    update: {},
    create: {
      name: "Corverxis Demo",
      slug: "corverxis-demo",
      plan: OrgPlan.PROFESSIONAL,
      dataRegion: "us-east-1",
    },
  });

  // Demo asset
  const demoAsset = await prisma.asset.upsert({
    where: { id: "demo-asset-001" },
    update: {},
    create: {
      id: "demo-asset-001",
      name: "CNC Machining Center #1",
      description: "5-axis CNC mill with sensor array",
      orgId: demoOrg.id,
      vertical: "manufacturing",
      location: "Plant A - Bay 3",
      tags: ["cnc", "demo", "manufacturing"],
    },
  });

  // Demo sensors
  const sensorDefs = [
    { name: "Spindle Vibration", type: "spindle_vib", unit: "mm/s",
      thresholds: { warning: 4.5, critical: 7.1, low: 0 } },
    { name: "Bearing Temperature", type: "bearing_temp", unit: "°C",
      thresholds: { warning: 75, critical: 90, low: -10 } },
    { name: "Motor Current Draw", type: "motor_current", unit: "A",
      thresholds: { warning: 42, critical: 48, low: 0 } },
    { name: "Hydraulic Pressure", type: "hydraulic_pressure", unit: "bar",
      thresholds: { warning: 180, critical: 200, low: 50 } },
  ];

  for (const def of sensorDefs) {
    await prisma.sensor.upsert({
      where: { id: `demo-sensor-${def.type}` },
      update: {},
      create: {
        id: `demo-sensor-${def.type}`,
        name: def.name,
        type: def.type,
        unit: def.unit,
        assetId: demoAsset.id,
        thresholds: def.thresholds,
        mlAlgorithm: "ensemble",
      },
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
