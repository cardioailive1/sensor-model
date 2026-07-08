"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  registeredAt: string;
  lastLoginAt: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?filter=${filter}`);
      if (res.status === 403) { router.push("/app"); return; }
      const data = await res.json();
      setUsers(data.data ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [filter]);

  const action = async (userId: string, act: "approve" | "reject", role = "ENGINEER") => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: act, role }),
      });
      const data = await res.json();
      setMessage(data.message ?? "Done");
      fetchUsers();
    } finally { setActionLoading(null); }
  };

  const badge = (user: User) => {
    if (user.rejectedAt) return { label: "Rejected", color: "#ef4444" };
    if (user.approved) return { label: user.role, color: "#22c55e" };
    return { label: "Pending", color: "#f59e0b" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", color: "#fff", fontFamily: "Inter, sans-serif", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>User Management</h1>
            <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>Approve or reject team member access requests</p>
          </div>
          <button onClick={() => router.push("/app")}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>
            ← Back to App
          </button>
        </div>

        {message && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "10px 16px", color: "#22c55e", fontSize: 13, marginBottom: 20 }}>
            {message}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["pending", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: filter === f ? "#00c2e0" : "rgba(255,255,255,0.06)",
              color: filter === f ? "#0a1628" : "#9ca3af",
            }}>
              {f === "pending" ? "Pending Approval" : "All Members"}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>
              {filter === "pending" ? "No pending approvals 🎉" : "No members found"}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Name", "Email", "Registered", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => {
                  const b = badge(user);
                  return (
                    <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <td style={{ padding: "14px 16px", fontSize: 14, color: "#fff" }}>{user.name ?? "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#9ca3af" }}>{user.email}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#6b7280" }}>
                        {new Date(user.registeredAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}40`, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>
                          {b.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {!user.approved && !user.rejectedAt && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => action(user.id, "approve", "ENGINEER")}
                              disabled={actionLoading === user.id}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => action(user.id, "reject")}
                              disabled={actionLoading === user.id}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                              ✗ Reject
                            </button>
                          </div>
                        )}
                        {user.approved && <span style={{ color: "#4b5563", fontSize: 12 }}>Approved {user.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : ""}</span>}
                        {user.rejectedAt && <span style={{ color: "#4b5563", fontSize: 12 }}>Rejected</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
