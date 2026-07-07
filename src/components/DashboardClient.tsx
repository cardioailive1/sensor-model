"use client";

import { useState } from "react";
import { Activity, Bell, Settings, LogOut, ChevronRight, Zap, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import SensorChart from "@/components/SensorChart";
import AlertBadge from "@/components/AlertBadge";

interface Props {
  assets: any[];
  alertCount: number;
  user: any;
}

export default function DashboardClient({ assets, alertCount, user }: Props) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(
    assets[0]?.id ?? null
  );

  const activeAsset = assets.find((a) => a.id === selectedAsset);

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ocean/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-ocean" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm">SensorModel</span>
            <span className="text-gray-500 text-xs ml-2">Corverxis Technologies</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{alertCount} active alert{alertCount !== 1 ? "s" : ""}</span>
            </div>
          )}
          <span className="text-gray-400 text-sm hidden sm:block">{user.name ?? user.email}</span>
          <button
            onClick={() => signOut()}
            className="text-gray-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside className="w-64 border-r border-white/10 overflow-y-auto p-4 hidden md:block">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Assets</p>
          <ul className="space-y-1">
            {assets.map((asset) => {
              const unresolvedAlerts = asset.sensors.flatMap((s: any) => s.alerts).length;
              return (
                <li key={asset.id}>
                  <button
                    onClick={() => setSelectedAsset(asset.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedAsset === asset.id
                        ? "bg-ocean/20 text-ocean"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{asset.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {unresolvedAlerts > 0 && <AlertBadge count={unresolvedAlerts} />}
                      <ChevronRight className="w-3 h-3 opacity-40" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {assets.length === 0 && (
            <p className="text-gray-600 text-xs px-3">No assets yet. Create one to get started.</p>
          )}
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeAsset ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-white">{activeAsset.name}</h1>
                <p className="text-gray-400 text-sm capitalize">
                  {activeAsset.vertical?.replace(/_/g, " ")} · {activeAsset.sensors.length} sensor{activeAsset.sensors.length !== 1 ? "s" : ""}
                  {activeAsset.location ? ` · ${activeAsset.location}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeAsset.sensors.map((sensor: any) => (
                  <SensorChart key={sensor.id} sensor={sensor} />
                ))}
              </div>

              {activeAsset.sensors.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No sensors configured for this asset.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">Select an asset to view sensor data</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
