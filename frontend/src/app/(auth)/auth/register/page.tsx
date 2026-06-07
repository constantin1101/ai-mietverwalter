"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message.includes("already registered")
        ? "Diese E-Mail ist bereits registriert."
        : signUpError.message);
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      router.push("/auth/confirm-email");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={160} className="mb-2" />
          <p className="text-[15px] text-muted-foreground">
            Kostenlos starten — 1 Einheit, kein Abo nötig.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
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
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
            {loading ? "Registriere…" : "Konto erstellen"}
          </button>

          <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
            Mit der Registrierung stimmst du den{" "}
            <Link href="/agb" className="underline hover:text-foreground">AGB</Link> und der{" "}
            <Link href="/datenschutz" className="underline hover:text-foreground">Datenschutzerklärung</Link> zu.
          </p>
        </form>

        <p className="text-center text-[14px] text-muted-foreground mt-5">
          Bereits registriert?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
