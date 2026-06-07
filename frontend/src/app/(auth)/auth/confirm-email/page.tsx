import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="text-4xl mb-2">📬</div>
          <CardTitle>E-Mail bestätigen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke
            den Link darin an — danach kannst du dich anmelden.
          </p>
          <Link href="/auth/login" className="text-sm underline text-primary block">
            Zur Anmeldung
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
