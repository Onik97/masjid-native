import type { Day } from '@/features/masjidbox/api';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export type Slot = { prayer: Prayer; label: string; athan: string; iqamah: string };

const LABELS: Record<Prayer, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

// ponytail: every mosque is read on London's calendar; keep each mosque's own timezone once one abroad is added.
const londonDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });

/** YYYY-MM-DD of `now` on the mosques' wall clock. */
export function localDate(now: Date): string {
  return londonDate.format(now);
}

export function dayOn(days: Day[], date: string): Day | undefined {
  return days.find((d) => d.date.slice(0, 10) === date);
}

/** HH:mm as printed on the mosque's timetable. */
export function clock(iso: string): string {
  return iso.slice(11, 16);
}

/** The day's five congregations; on Fridays dhuhr becomes Jumuah. */
export function slots(day: Day): Slot[] {
  return PRAYERS.map((prayer) => {
    if (prayer === 'dhuhr' && day.jumuah?.length) {
      return {
        prayer,
        label: 'Jumuah',
        athan: day.jumuah[0],
        iqamah: day.iqamah.jumuah?.[0] ?? day.iqamah.dhuhr,
      };
    }
    return { prayer, label: LABELS[prayer], athan: day[prayer], iqamah: day.iqamah[prayer] };
  });
}

export function slot(day: Day, prayer: Prayer): Slot {
  return slots(day).find((s) => s.prayer === prayer)!;
}

/** The first congregation whose iqamah hasn't started yet. */
export function nextSlot(day: Day, now: Date): Slot | undefined {
  return slots(day).find((s) => Date.parse(s.iqamah) > now.getTime());
}

/**
 * Which day and prayer the screen should open on: the soonest iqamah still ahead at any mosque,
 * or tomorrow's Fajr once every mosque has started Isha.
 */
export function focus(timetables: Day[][], now: Date): { date: string; prayer: Prayer } {
  const today = localDate(now);
  const upcoming = timetables
    .map((days) => dayOn(days, today))
    .flatMap((day) => (day ? (nextSlot(day, now) ?? []) : []))
    .sort((a, b) => Date.parse(a.iqamah) - Date.parse(b.iqamah));
  if (upcoming.length) return { date: today, prayer: upcoming[0].prayer };
  return { date: localDate(new Date(now.getTime() + 24 * 3600_000)), prayer: 'fajr' };
}

/** "in 1h 05m", "in 7m", "now". */
export function until(iso: string, now: Date): string {
  const minutes = Math.ceil((Date.parse(iso) - now.getTime()) / 60_000);
  if (minutes <= 0) return 'now';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `in ${m}m`;
  return `in ${h}h ${String(m).padStart(2, '0')}m`;
}

export type Moment = { kind: 'athan' | 'iqamah'; at: string };

/**
 * What a congregation's countdown aims at: its athan while that is still ahead and shown,
 * otherwise its iqamah; undefined once the iqamah has started.
 */
export function nextMoment(s: Slot, now: Date, showAthan: boolean): Moment | undefined {
  if (showAthan && Date.parse(s.athan) > now.getTime()) return { kind: 'athan', at: s.athan };
  if (Date.parse(s.iqamah) > now.getTime()) return { kind: 'iqamah', at: s.iqamah };
  return undefined;
}

/** Whole hours, minutes and seconds left until `iso`, never negative. */
export function countdown(iso: string, now: Date) {
  const total = Math.max(0, Math.floor((Date.parse(iso) - now.getTime()) / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

/** "28:36" under an hour, "1:05:12" from an hour up. */
export function formatCountdown({ hours, minutes, seconds }: ReturnType<typeof countdown>) {
  const ss = String(seconds).padStart(2, '0');
  if (!hours) return `${minutes}:${ss}`;
  return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
}
