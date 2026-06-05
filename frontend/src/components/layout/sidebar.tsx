"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/dashboard/units", label: "Einheiten", icon: Building2 },
  { href: "/dashboard/documents", label: "Dokumente", icon: FileText },
  { href: "/dashboard/calendar", label: "Fristen", icon: CalendarDays },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r bg-card px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-6">
        <span className="text-xl">🏠</span>
        <span className="font-semibold text-sm">AI-Mietverwalter</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-3 text-muted-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Abmelden
      </Button>
    </aside>
  );
}
