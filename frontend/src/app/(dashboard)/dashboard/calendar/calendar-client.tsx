"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DeadlineCard } from "@/types/api";

const DEADLINE_TYPE_LABEL: Record<string, string> = {
  rent_adjustment: "Mietanpassung",
  lease_termination: "Vertragsende",
  notice_period: "Kündigungsfrist",
  inspection: "Besichtigung",
  insurance_renewal: "Versicherung",
  utility_statement: "NK-Abrechnung",
  tax_deadline: "Steuertermin",
  custom: "Individuell",
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function getUrgencyClasses(dueDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "bg-red-100 text-red-700";
  if (diffDays <= 7) return "bg-red-50 text-red-600";
  if (diffDays <= 14) return "bg-amber-50 text-amber-700";
  if (diffDays <= 30) return "bg-yellow-50 text-yellow-700";
  return "bg-stone-100 text-stone-600";
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface DayCell {
  day: number | null;
  dateKey: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildCalendarGrid(year: number, month: number): DayCell[] {
  const today = new Date();
  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: DayCell[] = [];

  // Leading padding from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month - 1 < 0 ? 11 : month - 1;
    const prevYear = month - 1 < 0 ? year - 1 : year;
    cells.push({
      day: d,
      dateKey: toDateKey(prevYear, prevMonth, d),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = toDateKey(year, month, d);
    cells.push({
      day: d,
      dateKey,
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }

  // Trailing padding to fill 42 cells
  const remaining = 42 - cells.length;
  const nextMonth = month + 1 > 11 ? 0 : month + 1;
  const nextYear = month + 1 > 11 ? year + 1 : year;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      dateKey: toDateKey(nextYear, nextMonth, d),
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return cells;
}

function UpcomingDeadlineRow({ deadline }: { deadline: DeadlineCard }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline.due_date);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let daysLabel: string;
  if (diffDays < 0) daysLabel = `${Math.abs(diffDays)}d überfällig`;
  else if (diffDays === 0) daysLabel = "Heute";
  else if (diffDays === 1) daysLabel = "Morgen";
  else daysLabel = `in ${diffDays}d`;

  const urgencyDot =
    diffDays < 0
      ? "bg-red-500"
      : diffDays <= 7
      ? "bg-red-400"
      : diffDays <= 14
      ? "bg-amber-400"
      : diffDays <= 30
      ? "bg-yellow-400"
      : "bg-stone-300";

  const dateFormatted = new Date(deadline.due_date + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${urgencyDot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground truncate">{deadline.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            {DEADLINE_TYPE_LABEL[deadline.deadline_type] ?? deadline.deadline_type}
          </span>
          {deadline.address && (
            <span className="text-[11px] text-muted-foreground">· {deadline.address}</span>
          )}
          {deadline.tenant_name && (
            <span className="text-[11px] text-muted-foreground">· {deadline.tenant_name}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[12px] font-medium text-foreground tabular-nums">{dateFormatted}</p>
        <p
          className={`text-[10px] font-medium ${
            diffDays < 0 ? "text-red-600" : diffDays <= 7 ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {daysLabel}
        </p>
      </div>
    </div>
  );
}

export function CalendarClient({ deadlines }: { deadlines: DeadlineCard[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const activeDeadlines = useMemo(
    () => deadlines.filter((d) => !d.is_completed),
    [deadlines]
  );

  const deadlinesByDate = useMemo(() => {
    const map: Record<string, DeadlineCard[]> = {};
    for (const d of activeDeadlines) {
      if (!map[d.due_date]) map[d.due_date] = [];
      map[d.due_date].push(d);
    }
    return map;
  }, [activeDeadlines]);

  const upcomingDeadlines = useMemo(() => {
    const todayStr = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    return [...activeDeadlines]
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .filter((d) => d.due_date >= todayStr)
      .slice(0, 10);
  }, [activeDeadlines]);

  const calendarCells = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  if (activeDeadlines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Fristen-Kalender</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">Alle Termine im Überblick</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-dashed border-border p-16 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-[16px] font-semibold text-foreground">Keine offenen Fristen</p>
          <p className="text-[14px] text-muted-foreground mt-1">
            Aktuell sind keine offenen Termine oder Fristen vorhanden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fristen-Kalender</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            {activeDeadlines.length} offene Frist{activeDeadlines.length !== 1 ? "en" : ""}
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={prevMonth}
            className="px-3 py-2 hover:bg-accent transition-colors"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="px-4 py-2 text-[14px] font-semibold text-foreground min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="px-3 py-2 hover:bg-accent transition-colors"
            aria-label="Nächster Monat"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Body: calendar + sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="lg:flex-[2] bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarCells.map((cell, idx) => {
              const cellDeadlines = cell.dateKey ? (deadlinesByDate[cell.dateKey] ?? []) : [];
              const shown = cellDeadlines.slice(0, 2);
              const overflow = cellDeadlines.length - 2;

              return (
                <div
                  key={idx}
                  className={[
                    "min-h-[90px] p-1.5 border-b border-r border-border/40 relative",
                    !cell.isCurrentMonth ? "bg-stone-50/60" : "bg-white",
                    idx % 7 === 6 ? "border-r-0" : "",
                    Math.floor(idx / 7) === 5 ? "border-b-0" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Day number */}
                  <div
                    className={[
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium mb-1",
                      cell.isToday
                        ? "bg-primary text-white font-bold"
                        : cell.isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/40",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cell.day}
                  </div>

                  {/* Deadline chips */}
                  <div className="space-y-0.5">
                    {shown.map((d) => (
                      <div
                        key={d.id}
                        title={`${d.title}${d.address ? ` · ${d.address}` : ""}${d.tenant_name ? ` · ${d.tenant_name}` : ""}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate leading-tight ${getUrgencyClasses(d.due_date)}`}
                      >
                        {d.title}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground bg-stone-100 truncate leading-tight">
                        +{overflow} weitere
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming deadlines sidebar */}
        <div className="lg:flex-[1] space-y-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <h2 className="text-[14px] font-semibold text-foreground">Nächste Fristen</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Kommende 10 Termine</p>
            </div>
            <div className="px-5 py-2">
              {upcomingDeadlines.length === 0 ? (
                <p className="py-4 text-[13px] text-muted-foreground text-center">
                  Keine anstehenden Fristen
                </p>
              ) : (
                upcomingDeadlines.map((d) => (
                  <UpcomingDeadlineRow key={d.id} deadline={d} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="bg-white rounded-2xl border border-border shadow-sm px-5 py-4">
        <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Legende
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Überfällig", classes: "bg-red-100 text-red-700" },
            { label: "Heute / ≤ 7 Tage", classes: "bg-red-50 text-red-600" },
            { label: "8–14 Tage", classes: "bg-amber-50 text-amber-700" },
            { label: "15–30 Tage", classes: "bg-yellow-50 text-yellow-700" },
            { label: "> 30 Tage", classes: "bg-stone-100 text-stone-600" },
          ].map(({ label, classes }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${classes}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
