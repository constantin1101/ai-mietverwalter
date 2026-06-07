"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Logo } from "@/components/brand/logo";

const navItems = [
  { href: "/dashboard",           label: "Übersicht",     icon: LayoutDashboard },
  { href: "/dashboard/units",     label: "Einheiten",     icon: Building2 },
  { href: "/dashboard/documents", label: "Dokumente",     icon: FileText },
  { href: "/dashboard/calendar",  label: "Fristen",       icon: CalendarDays },
  { href: "/dashboard/settings",  label: "Einstellungen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-16 lg:w-60 min-h-screen border-r border-border bg-white shrink-0 transition-all duration-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0">
        <Logo iconOnly size={30} className="shrink-0" />
        <span className="hidden lg:block font-bold text-[15px] text-[#1C2B3A] tracking-tight leading-none">
          Heimio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 h-9 text-sm transition-colors duration-150",
                active
                  ? "bg-accent text-primary font-semibold"
                  : "text-muted-foreground hover:bg-stone-50 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              <span className="hidden lg:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 h-9 w-full text-sm text-muted-foreground hover:bg-stone-50 hover:text-foreground transition-colors duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block">Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
