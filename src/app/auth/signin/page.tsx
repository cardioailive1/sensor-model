"use client";

export const dynamic = "force-dynamic";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Chrome, Github, Building2 } from "lucide-react";

const providers = [
  { id: "google", label: "Continue with Google", Icon: Chrome, color: "bg-white text-gray-800 hover:bg-gray-100" },
  { id: "github", label: "Continue with GitHub", Icon: Github, color: "bg-gray-900 text-white hover:bg-gray-800 border border-gray-700" },
  { id: "microsoft-entra-id", label: "Continue with Microsoft", Icon: Building2, color: "bg-blue-600 text-white hover:bg-blue-700" },
];

export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId);
    try {
      await signIn(providerId, { callbackUrl: "/" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#00c2e0]/20 flex items-center justify-center">
              <span className="text-[#00c2e0] font-bold text-lg">S</span>
            </div>
            <div>
              <div className="text-white font-bold text-xl">SensorModel</div>
              <div className="text-[#00c2e0] text-xs tracking-widest uppercase">Corverxis Technologies</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Real-Time Sensor Prediction Platform</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-8">
          <h1 className="text-xl font-semibold text-white mb-2">Sign in to SensorModel</h1>
          <p className="text-gray-400 text-sm mb-6">Use your organisation identity provider for secure access.</p>

          <div className="space-y-3">
            {providers.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => handleSignIn(id)}
                disabled={loading !== null}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${color} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-center">
                  {loading === id ? "Redirecting..." : label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center">
              By signing in you agree to our Privacy Policy and Terms of Service.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          SOC 2 Type II · ISO 27001 · GDPR Compliant
        </p>
      </div>
    </div>
  );
}
