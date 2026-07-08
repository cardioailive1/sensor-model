import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    // Demo org
    const org = await prisma.org.upsert({
      where: { slug: "corverxis-demo" },
      update: {},
      create: {
        name: "Corverxis Demo",
        slug: "corverxis-demo",
        plan: "PROFESSIONAL",
        dataRegion: "us-east-1",
      },
    });

    // Demo asset
    const asset = await prisma.asset.upsert({
      where: { id: "demo-asset-001" },
      update: {},
      create: {
        id: "demo-asset-001",
        name: "CNC Machining Center #1",
        description: "5-axis CNC mill with sensor array",
        orgId: org.id,
        vertical: "manufacturing",
        location: "Plant A - Bay 3",
        tags: ["cnc", "demo", "manufacturing"],
      },
    });

    // Demo sensors
    const sensors = [
      { id: "demo-sensor-spindle", name: "Spindle Vibration", type: "spindle_vib", unit: "mm/s", thresholds: { warning: 4.5, critical: 7.1, low: 0 } },
      { id: "demo-sensor-bearing", name: "Bearing Temperature", type: "bearing_temp", unit: "°C", thresholds: { warning: 75, critical: 90, low: -10 } },
      { id: "demo-sensor-current", name: "Motor Current Draw", type: "motor_current", unit: "A", thresholds: { warning: 42, critical: 48, low: 0 } },
      { id: "demo-sensor-hydraulic", name: "Hydraulic Pressure", type: "hydraulic_pressure", unit: "bar", thresholds: { warning: 180, critical: 200, low: 50 } },
    ];

    for (const s of sensors) {
      await prisma.sensor.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          type: s.type,
          unit: s.unit,
          assetId: asset.id,
          thresholds: s.thresholds,
          mlAlgorithm: "ensemble",
        },
      });
    }

    // Link logged-in users to demo org
    await prisma.user.updateMany({
      where: { orgId: null },
      data: { orgId: org.id },
    });

    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
      org: org.name,
      asset: asset.name,
      sensors: sensors.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
