"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-Mail oder Passwort falsch.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={160} className="mb-2" />
          <p className="text-[15px] text-muted-foreground">Melde dich in deinem Konto an.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="max@mustermann.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <Link href="/auth/reset-password" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                Vergessen?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[14px] text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-primary text-white text-[15px] font-medium hover:bg-primary/90 transition-colors duration-150 disabled:opacity-40"
          >
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>

        <p className="text-center text-[14px] text-muted-foreground mt-5">
          Noch kein Konto?{" "}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
