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

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/new-password`,
    });

    if (error) {
      setError("Fehler beim Senden. Bitte erneut versuchen.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="text-2xl mb-1">🔑</div>
          <CardTitle>Passwort zurücksetzen</CardTitle>
          <CardDescription>
            Wir schicken dir einen Link zum Zurücksetzen.
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="text-center py-6">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-medium">E-Mail gesendet!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bitte prüfe dein Postfach.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleReset}>
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
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sende…" : "Link senden"}
              </Button>
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground underline text-center"
              >
                Zurück zur Anmeldung
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
