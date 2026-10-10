const MS_PER_DAY = 86_400_000;

export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Plain yyyy-mm-dd is parsed as local time to avoid off-by-one day errors.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toISODate(value: string | Date): string {
  const d = toDate(value);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(value: string | Date, days: number): Date {
  const d = toDate(value);
  d.setDate(d.getDate() + days);
  return d;
}

function dayIndex(value: string | Date): number {
  const d = toDate(value);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string | Date, to: string | Date): number {
  return dayIndex(to) - dayIndex(from);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* Locale-aware formatting: the language preference in Settings re-formats
   every date in the workspace immediately. */
const LOCALE_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ta: "ta-IN",
};

let currentLocale = "en-IN";
const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function setLocale(language: string): void {
  currentLocale = LOCALE_MAP[language] ?? "en-IN";
}

export function getLocale(): string {
  return currentLocale;
}

function makeFormatter(key: string, options: Intl.DateTimeFormatOptions) {
  return {
    format(value: Date): string {
      const cacheKey = `${currentLocale}:${key}`;
      let formatter = formatterCache.get(cacheKey);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(currentLocale, options);
        formatterCache.set(cacheKey, formatter);
      }
      return formatter.format(value);
    },
  };
}

const dateFmt = makeFormatter("date", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFmt = makeFormatter("short", {
  day: "numeric",
  month: "short",
});

const weekdayFmt = makeFormatter("weekday", { weekday: "short" });

const monthFmt = makeFormatter("month", { month: "short" });

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  return dateFmt.format(toDate(value));
}

export function formatShortDate(value?: string | Date | null): string {
  if (!value) return "—";
  return shortDateFmt.format(toDate(value));
}

export function formatWeekday(value: string | Date): string {
  return weekdayFmt.format(toDate(value));
}

export function formatMonth(value: string | Date): string {
  return monthFmt.format(toDate(value));
}

export function formatDateRange(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${dateFmt.format(e)}`;
  }
  return `${shortDateFmt.format(s)} – ${shortDateFmt.format(e)}`;
}

const timeFmt = makeFormatter("time", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatTime(value: string | Date): string {
  return timeFmt.format(toDate(value));
}

export function relativeTime(value: string | Date): string {
  const then = toDate(value).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function daysLabel(days: number): string {
  const abs = Math.abs(days);
  if (abs === 0) return "today";
  return `${abs} day${abs === 1 ? "" : "s"}`;
}

/** Human phrasing for "how far away is the window" including past tense. */
export function describeDaysUntil(days: number, noun = "harvest window"): string {
  if (days === 0) return `${noun} opens today`;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} until ${noun}`;
  const abs = Math.abs(days);
  return `${noun} opened ${abs} day${abs === 1 ? "" : "s"} ago`;
}

export function monthKey(value: string | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}
