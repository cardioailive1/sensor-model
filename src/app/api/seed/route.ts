import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const SENSOR_GROUPS = [
  { vertical:"manufacturing",       assetId:"asset-mfg",   assetName:"CNC Machining Center",          location:"Plant A - Bay 3",        sensors:[
    {id:"mfg_vib",   name:"CNC Spindle Vibration",     unit:"mm/s", thresholds:{warning:4.2,  critical:8.5,  low:0}},
    {id:"mfg_temp",  name:"Spindle Bearing Temp",      unit:"degC", thresholds:{warning:65,   critical:85,   low:0}},
    {id:"mfg_curr",  name:"Motor Drive Current",       unit:"A",    thresholds:{warning:28,   critical:38,   low:0}},
    {id:"mfg_press", name:"Hydraulic System Pressure", unit:"bar",  thresholds:{warning:145,  critical:160,  low:0}},
  ]},
  { vertical:"industrial_automation", assetId:"asset-aut", assetName:"6-Axis Robot Assembly Line",    location:"Production Hall B",      sensors:[
    {id:"aut_servo", name:"Servo Motor Torque",        unit:"Nm",    thresholds:{warning:78,  critical:95,  low:0}},
    {id:"aut_flow",  name:"Process Flow Rate",         unit:"L/min", thresholds:{warning:62,  critical:45,  low:0}},
    {id:"aut_pos",   name:"Linear Position Encoder",   unit:"um",    thresholds:{warning:8,   critical:25,  low:0}},
    {id:"aut_ae",    name:"Acoustic Emission",         unit:"dBV",   thresholds:{warning:72,  critical:88,  low:0}},
  ]},
  { vertical:"healthcare",           assetId:"asset-hth",  assetName:"Patient Monitoring System",     location:"ICU Ward 4",             sensors:[
    {id:"hth_ecg",  name:"ECG Heart Rate",             unit:"bpm",  thresholds:{warning:100,  critical:130,  low:40}},
    {id:"hth_spo2", name:"SpO2 Oxygen Saturation",    unit:"%",    thresholds:{warning:94,   critical:90,   low:80}},
    {id:"hth_bp",   name:"Blood Pressure (systolic)",  unit:"mmHg", thresholds:{warning:140,  critical:180,  low:80}},
    {id:"hth_temp", name:"Patient Body Temperature",   unit:"degC", thresholds:{warning:38.5, critical:40,   low:35}},
  ]},
  { vertical:"aerospace",            assetId:"asset-aero", assetName:"CFM56 Turbofan Engine",         location:"Hangar 7 - Gate C",      sensors:[
    {id:"aero_vib",   name:"Engine Fan Vibration",     unit:"g RMS", thresholds:{warning:2.5,  critical:5.0,  low:0}},
    {id:"aero_temp",  name:"EGT Exhaust Gas Temp",     unit:"degC",  thresholds:{warning:720,  critical:800,  low:0}},
    {id:"aero_press", name:"Hydraulic System Pressure",unit:"psi",   thresholds:{warning:3200, critical:3400, low:0}},
    {id:"aero_oil",   name:"Engine Oil Pressure",      unit:"psi",   thresholds:{warning:45,   critical:35,  low:20}},
  ]},
  { vertical:"ev_battery",           assetId:"asset-ev",   assetName:"EV Battery Pack NMC",           location:"Assembly Line 2",        sensors:[
    {id:"ev_temp", name:"Cell Temperature",            unit:"degC", thresholds:{warning:45,   critical:60,   low:-10}},
    {id:"ev_volt", name:"Cell Voltage",                unit:"V",    thresholds:{warning:4.18, critical:4.25, low:2.5}},
    {id:"ev_curr", name:"Pack Charge Current",         unit:"A",    thresholds:{warning:120,  critical:180,  low:0}},
    {id:"ev_soc",  name:"State of Charge",             unit:"%",    thresholds:{warning:15,   critical:8,    low:0}},
  ]},
  { vertical:"power_systems",        assetId:"asset-pwr",  assetName:"11kV Distribution Transformer", location:"Substation Alpha",       sensors:[
    {id:"pwr_curr", name:"Transformer Current",        unit:"A",    thresholds:{warning:520,  critical:600,  low:0}},
    {id:"pwr_temp", name:"Transformer Oil Temp",       unit:"degC", thresholds:{warning:80,   critical:95,   low:0}},
    {id:"pwr_pdis", name:"Partial Discharge",          unit:"pC",   thresholds:{warning:100,  critical:500,  low:0}},
    {id:"pwr_freq", name:"Grid Frequency",             unit:"Hz",   thresholds:{warning:49.8, critical:49.5, low:49}},
  ]},
  { vertical:"mining",               assetId:"asset-min",  assetName:"Primary Jaw Crusher",           location:"Underground Level 3",    sensors:[
    {id:"min_vib",    name:"Crusher Bearing Vibration",unit:"mm/s",  thresholds:{warning:8.5, critical:18,  low:0}},
    {id:"min_dust",   name:"Respirable Dust PM2.5",    unit:"mg/m3", thresholds:{warning:2.0, critical:3.5, low:0}},
    {id:"min_gas",    name:"Methane Concentration",    unit:"% LEL", thresholds:{warning:20,  critical:40,  low:0}},
    {id:"min_stress", name:"Roof Support Load",        unit:"t",     thresholds:{warning:72,  critical:90,  low:0}},
  ]},
  { vertical:"renewable_energy",     assetId:"asset-re",   assetName:"15MW Offshore Wind Turbine",    location:"North Sea - Block 12",   sensors:[
    {id:"re_vib",   name:"Gearbox Vibration",          unit:"mm/s", thresholds:{warning:9.0, critical:18,  low:0}},
    {id:"re_temp",  name:"Nacelle Ambient Temp",       unit:"degC", thresholds:{warning:60,  critical:75,  low:-20}},
    {id:"re_power", name:"Active Power Output",        unit:"kW",   thresholds:{warning:600, critical:200, low:0}},
    {id:"re_pv",    name:"PV Panel Temperature",       unit:"degC", thresholds:{warning:70,  critical:85,  low:-10}},
  ]},
];

export async function GET() {
  try {
    const org = await prisma.org.upsert({
      where: { slug: "corverxis-demo" },
      update: {},
      create: { name: "Corverxis Demo", slug: "corverxis-demo", plan: "PROFESSIONAL", dataRegion: "us-east-1" },
    });

    let assetCount = 0, sensorCount = 0;
    for (const group of SENSOR_GROUPS) {
      const asset = await prisma.asset.upsert({
        where: { id: group.assetId },
        update: {},
        create: { id: group.assetId, name: group.assetName, orgId: org.id, vertical: group.vertical, location: group.location, tags: [group.vertical, "demo"] },
      });
      assetCount++;
      for (const s of group.sensors) {
        await prisma.sensor.upsert({
          where: { id: s.id },
          update: {},
          create: { id: s.id, name: s.name, type: s.id, unit: s.unit, assetId: asset.id, thresholds: s.thresholds, mlAlgorithm: "ensemble" },
        });
        sensorCount++;
      }
    }
    await prisma.user.updateMany({ where: { orgId: null }, data: { orgId: org.id } });
    return NextResponse.json({ success: true, assets: assetCount, sensors: sensorCount, message: "All 8 verticals seeded" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
