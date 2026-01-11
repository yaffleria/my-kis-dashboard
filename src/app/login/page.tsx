"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TerminalHeader } from "@/components/terminal";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper to hash password
  const sha256 = async (str: string) => {
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Hash the password before sending over network
      const hashedPassword = await sha256(password);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: hashedPassword }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("ACCESS DENIED: INVALID SECURITY PROTOCOL");
        setLoading(false);
      }
    } catch {
      setError("SYSTEM ERROR: CONNECTION FAILED");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-terminal-bg text-terminal-text font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <TerminalHeader title="SECURITY CHECK" ip="UNKNOWN" status="LOCKED" />

        <form
          onSubmit={handleLogin}
          className="border border-terminal-border p-8 bg-terminal-bg relative shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-2 h-2 bg-brew-green" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-brew-green" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-brew-green" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-brew-green" />

          <div className="mb-8 text-center space-y-2">
            <h1 className="text-2xl font-bold text-brew-green custom-text-shadow animate-pulse">
              SYSTEM LOCKED
            </h1>
            <p className="text-sm text-terminal-muted">
              ENTER AUTHORIZATION CODE TO PROCEED
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-brew-green mb-1 block">
                PASSPHRASE
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-terminal-border p-3 text-center text-xl tracking-widest focus:border-brew-green outline-none text-brew-green placeholder-terminal-muted/30 transition-all focus:shadow-[0_0_10px_rgba(51,255,0,0.3)]"
                placeholder="••••••••"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-brew-red text-xs text-center font-bold animate-pulse">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-brew-green bg-brew-green/10 text-brew-green hover:bg-brew-green hover:text-terminal-bg transition-all font-bold tracking-wider py-6 mt-4"
            >
              {loading ? "VERIFYING..." : "UNLOCK TERMINAL"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
