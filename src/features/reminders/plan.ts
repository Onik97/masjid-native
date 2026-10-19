import type { Day } from '@/features/masjidbox/api';
import { clock, localDate, slots, type Prayer } from '@/features/prayers/times';

/** `body` shows while counting down to `iqamah`, `nowBody` once it is reached. */
export type Reminder = { at: number; iqamah: number; title: string; body: string; nowBody: string };

/**
 * Every reminder whose iqamah is still ahead of `now` today and tomorrow: `minutesBefore` each chosen iqamah. Only
 * two days, so a mosque changing its timetable is picked up by the next reschedule (on open or in
 * the background) instead of firing at old times for weeks.
 */
export function reminderPlan(
  mosqueName: string,
  days: Day[],
  prayers: Prayer[],
  minutesBefore: number,
  now: Date,
): Reminder[] {
  const window = [localDate(now), localDate(new Date(now.getTime() + 24 * 3600_000))];
  return days
    .filter((day) => window.includes(day.date.slice(0, 10)))
    .flatMap((day) =>
      slots(day)
        .filter((s) => prayers.includes(s.prayer))
        .map((s) => ({
          at: Date.parse(s.iqamah) - minutesBefore * 60_000,
          iqamah: Date.parse(s.iqamah),
          title: `${s.label} iqamah ${clock(s.iqamah)} · ${mosqueName}`,
          body: minutesBefore ? 'Starting soon' : 'Starting now',
          nowBody: 'Starting now',
        }))
        // Kept until the iqamah, not the reminder, so a reschedule mid-countdown still ends it at zero.
        .filter((r) => r.iqamah > now.getTime()),
    );
}
