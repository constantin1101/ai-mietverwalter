"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // With Magic Link, sign-up and sign-in are the same call.
    // Supabase creates the user automatically on first OTP use.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Registrierung fehlgeschlagen. Bitte erneut versuchen.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="text-2xl mb-1">🏠</div>
          <CardTitle>Kostenloses Konto erstellen</CardTitle>
          <CardDescription>
            Starte kostenlos — 1 Einheit, kein Limit, kein Abo nötig.
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="text-center py-6">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-medium">E-Mail gesendet!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bitte prüfe dein Postfach und klicke den Bestätigungslink an.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max@mustermann.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Mit der Registrierung stimmst du unseren{" "}
                <Link href="/agb" className="underline">AGB</Link> und der{" "}
                <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link> zu.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sende Link…" : "Jetzt registrieren"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Bereits registriert?{" "}
                <Link href="/auth/login" className="underline">
                  Anmelden
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
