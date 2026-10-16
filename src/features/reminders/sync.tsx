import { useMosques } from '@/features/mosques/store';
import { timetableQuery } from '@/features/prayers/queries';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { keepRemindersFresh } from './background';
import { replaceReminders } from './notifications';
import { reminderPlan } from './plan';
import { useReminders } from './store';

/** Keeps the scheduled alarms in step with the settings and the latest timetable. Renders nothing. */
export function ReminderSync() {
  const { mosqueId, prayers, minutesBefore } = useReminders();
  // No fallback to another mosque: removing the reminder mosque pauses reminders, and Undo resumes them.
  const mosque = useMosques((s) => s.mosques.find((m) => m.id === mosqueId));
  const { data } = useQuery(
    mosque && prayers.length
      ? timetableQuery(mosque)
      : { queryKey: ['timetable', 'none'], queryFn: skipToken },
  );

  const on = Boolean(mosque && prayers.length);
  useEffect(() => {
    keepRemindersFresh(on);
  }, [on]);

  useEffect(() => {
    if (!mosque || !prayers.length) {
      replaceReminders([]);
      return;
    }
    if (data) replaceReminders(reminderPlan(mosque.name, data.days, prayers, minutesBefore, new Date()));
  }, [mosque, data, prayers, minutesBefore]);

  return null;
}
