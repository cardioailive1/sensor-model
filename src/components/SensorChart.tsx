"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, TrendingUp, Clock } from "lucide-react";

interface SensorProps {
  sensor: {
    id: string;
    name: string;
    type: string;
    unit: string;
    thresholds: any;
    mlAlgorithm: string;
    alerts: any[];
  };
}

interface DataPoint {
  t: string;
  value: number;
  predicted: number;
}

export default function SensorChart({ sensor }: SensorProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const thresholds = sensor.thresholds as any;
  const hasWarning = sensor.alerts.some((a) => a.severity === "WARNING");
  const hasCritical = sensor.alerts.some((a) => a.severity === "CRITICAL");

  const statusClass = hasCritical ? "status-critical" : hasWarning ? "status-warning" : "status-ok";
  const statusLabel = hasCritical ? "CRITICAL" : hasWarning ? "WARNING" : "OK";

  const fetchPrediction = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Use last 20 values (or simulated if no history)
      const values = data.length > 0
        ? data.slice(-20).map((d) => d.value)
        : Array.from({ length: 20 }, (_, i) => 20 + Math.sin(i * 0.5) * 5 + Math.random() * 2);

      const res = await fetch("/api/v1/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorId: sensor.id,
          values,
          algorithm: sensor.mlAlgorithm,
          includeFeaturesExtraction: true,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setLatestPrediction(json);
        setData((prev) => [
          ...prev.slice(-29),
          {
            t: new Date().toLocaleTimeString("en-US", { hour12: false }),
            value: values[values.length - 1],
            predicted: json.predicted,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [sensor.id, sensor.mlAlgorithm, data, loading]);

  useEffect(() => {
    fetchPrediction();
    const id = setInterval(fetchPrediction, 5000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white text-sm font-medium">{sensor.name}</p>
          <p className="text-gray-500 text-xs capitalize">{sensor.type.replace(/_/g, " ")}</p>
        </div>
        <span className={`sensor-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      {/* Chart */}
      <div className="h-28">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#0d1f3c", border: "1px solid #00c2e020", fontSize: 11 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#00c2e0" }}
              />
              <Line type="monotone" dataKey="value" stroke="#00c2e0" dot={false} strokeWidth={1.5} name={`Value (${sensor.unit})`} />
              <Line type="monotone" dataKey="predicted" stroke="#f59e0b" dot={false} strokeWidth={1} strokeDasharray="4 2" name={`Predicted (${sensor.unit})`} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 text-xs">
            {loading ? "Loading..." : "Awaiting data..."}
          </div>
        )}
      </div>

      {/* Stats */}
      {latestPrediction && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-ocean font-semibold">
              {latestPrediction.predicted?.toFixed(2)} <span className="text-gray-500">{sensor.unit}</span>
            </div>
            <div className="text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> Predicted
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-white font-semibold">
              {((latestPrediction.confidence ?? 0) * 100).toFixed(0)}%
            </div>
            <div className="text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Confidence
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className={`font-semibold ${latestPrediction.rulHours !== null ? "text-green-400" : "text-gray-500"}`}>
              {latestPrediction.rulHours !== null ? `${latestPrediction.rulHours}h` : "—"}
            </div>
            <div className="text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <Clock className="w-2.5 h-2.5" /> RUL
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
