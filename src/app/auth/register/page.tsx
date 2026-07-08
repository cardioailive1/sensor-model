"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "choose" | "super_admin" | "member";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orgCheck, setOrgCheck] = useState<{ exists: boolean; name?: string; id?: string } | null>(null);

  const [form, setForm] = useState({
    name: "", email: "", orgName: "", orgSlug: "", orgId: "", orgLookup: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const checkOrg = async () => {
    if (!form.orgLookup) return;
    const res = await fetch(`/api/register?org=${encodeURIComponent(form.orgLookup)}`);
    const data = await res.json();
    setOrgCheck(data);
    if (data.exists) set("orgId", data.id);
  };

  const slugify = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const body = mode === "super_admin"
        ? { name: form.name, email: form.email, orgName: form.orgName, orgSlug: form.orgSlug, role: "SUPER_ADMIN" }
        : { name: form.name, email: form.email, orgId: form.orgId, role: "ENGINEER" };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      setSuccess(data.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff",
    fontSize: 14, outline: "none", boxSizing: "border-box" as const,
  };
  const labelStyle = { color: "#9ca3af", fontSize: 12, marginBottom: 4, display: "block" };
  const btnStyle = (primary = true) => ({
    padding: "11px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
    fontWeight: 600, transition: "all 0.2s",
    background: primary ? "#00c2e0" : "rgba(255,255,255,0.08)",
    color: primary ? "#0a1628" : "#fff",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,194,224,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#00c2e0", fontWeight: 700, fontSize: 20 }}>S</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>SensorModel</div>
              <div style={{ color: "#00c2e0", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Corverxis Technologies</div>
            </div>
          </div>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Create your account</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 32 }}>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h2 style={{ color: "#fff", fontSize: 18, marginBottom: 12 }}>Registration Submitted</h2>
              <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{success}</p>
              <button onClick={() => router.push("/auth/signin")} style={btnStyle()}>
                Go to Sign In
              </button>
            </div>
          ) : mode === "choose" ? (
            <>
              <h2 style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>How would you like to register?</h2>
              <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Choose your account type to get started.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button onClick={() => setMode("super_admin")} style={{
                  padding: 20, borderRadius: 10, border: "1px solid rgba(0,194,224,0.3)",
                  background: "rgba(0,194,224,0.06)", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ color: "#00c2e0", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🏢 Register New Organisation</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Create a new organisation and become the Super Admin. You will manage all team members and approvals.</div>
                </button>

                <button onClick={() => setMode("member")} style={{
                  padding: 20, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>👤 Join Existing Organisation</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>Request access to your organisation. Your Super Admin will approve your account before you can sign in.</div>
                </button>
              </div>

              <div style={{ marginTop: 24, textAlign: "center" }}>
                <span style={{ color: "#6b7280", fontSize: 13 }}>Already have an account? </span>
                <button onClick={() => router.push("/auth/signin")} style={{ background: "none", border: "none", color: "#00c2e0", cursor: "pointer", fontSize: 13 }}>Sign in</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <button onClick={() => { setMode("choose"); setError(""); setOrgCheck(null); }}
                  style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20 }}>←</button>
                <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>
                  {mode === "super_admin" ? "Register New Organisation" : "Join Existing Organisation"}
                </h2>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 20 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input style={inputStyle} placeholder="John Smith" value={form.name} onChange={e => set("name", e.target.value)} />
                </div>

                <div>
                  <label style={labelStyle}>Work Email</label>
                  <input style={inputStyle} type="email" placeholder="john@company.com" value={form.email} onChange={e => set("email", e.target.value)} />
                </div>

                {mode === "super_admin" && (
                  <>
                    <div>
                      <label style={labelStyle}>Organisation Name</label>
                      <input style={inputStyle} placeholder="Acme Engineering Ltd"
                        value={form.orgName}
                        onChange={e => { set("orgName", e.target.value); set("orgSlug", slugify(e.target.value)); }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Organisation Slug (URL identifier)</label>
                      <input style={inputStyle} placeholder="acme-engineering"
                        value={form.orgSlug}
                        onChange={e => set("orgSlug", slugify(e.target.value))} />
                      <div style={{ color: "#4b5563", fontSize: 11, marginTop: 4 }}>Lowercase letters, numbers and hyphens only</div>
                    </div>
                  </>
                )}

                {mode === "member" && (
                  <div>
                    <label style={labelStyle}>Organisation Slug</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={{ ...inputStyle, flex: 1 }} placeholder="acme-engineering"
                        value={form.orgLookup}
                        onChange={e => { set("orgLookup", e.target.value); setOrgCheck(null); }} />
                      <button onClick={checkOrg} style={{ ...btnStyle(false), whiteSpace: "nowrap", padding: "10px 16px" }}>
                        Look up
                      </button>
                    </div>
                    {orgCheck && (
                      <div style={{
                        marginTop: 8, padding: "8px 12px", borderRadius: 6, fontSize: 13,
                        background: orgCheck.exists ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${orgCheck.exists ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: orgCheck.exists ? "#22c55e" : "#ef4444",
                      }}>
                        {orgCheck.exists ? `✓ Found: ${orgCheck.name}` : "✗ Organisation not found"}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={loading || (mode === "member" && !orgCheck?.exists)}
                  style={{ ...btnStyle(), marginTop: 8, opacity: (loading || (mode === "member" && !orgCheck?.exists)) ? 0.6 : 1 }}
                >
                  {loading ? "Submitting..." : mode === "super_admin" ? "Create Organisation & Account" : "Request Access"}
                </button>
              </div>

              {mode === "super_admin" && (
                <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(0,194,224,0.06)", border: "1px solid rgba(0,194,224,0.15)", borderRadius: 8 }}>
                  <p style={{ color: "#9ca3af", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                    As Super Admin you will be able to approve or reject team member registrations, manage roles, and access all organisation data.
                    You will sign in using your OAuth provider (Google, GitHub, or Microsoft) with the email address you register here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#374151", fontSize: 11, marginTop: 20 }}>
          SOC 2 Type II · ISO 27001 · GDPR Compliant
        </p>
      </div>
    </div>
  );
}
