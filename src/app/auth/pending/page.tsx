"use client";
export const dynamic = "force-dynamic";

import { signOut } from "next-auth/react";

export default function PendingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,194,224,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#00c2e0", fontWeight: 700, fontSize: 20 }}>S</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>SensorModel</div>
            <div style={{ color: "#00c2e0", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Corverxis Technologies</div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>⏳</div>
          <h2 style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>Awaiting Approval</h2>
          <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Your account registration has been received. Your organisation Super Admin needs to approve your access before you can sign in.
          </p>
          <div style={{ background: "rgba(0,194,224,0.06)", border: "1px solid rgba(0,194,224,0.15)", borderRadius: 8, padding: "14px 20px", marginBottom: 28 }}>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Once approved you will be able to sign in using your OAuth provider with the email address you registered with.
              Please contact your Super Admin if you need urgent access.
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 14 }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
