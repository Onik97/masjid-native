import { fetchTimetable } from '@/features/masjidbox/api';
import { useMosques } from '@/features/mosques/store';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { replaceReminders } from './notifications';
import { reminderPlan } from './plan';
import { useReminders } from './store';

const TASK = 'refresh-reminders';

// Defined at module scope and imported by the app entry: Android runs the task with no screen
// mounted. It refetches the reminder mosque's times and reschedules today's and tomorrow's
// reminders, so a timetable change reaches the alarms even if nobody opens the app.
TaskManager.defineTask(TASK, async () => {
  const { mosqueId, prayers, minutesBefore } = useReminders.getState();
  const mosque = useMosques.getState().mosques.find((m) => m.id === mosqueId);
  if (!mosque || !prayers.length) return BackgroundTask.BackgroundTaskResult.Success;
  try {
    const { days } = await fetchTimetable(mosque.source, new Date(), 2);
    await replaceReminders(reminderPlan(mosque.name, days, prayers, minutesBefore, new Date()));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    // Offline or Masjid Box down: the alarms already scheduled stay as they are.
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Runs the refresh every few hours while reminders are on; the system picks the exact time. */
export async function keepRemindersFresh(on: boolean) {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK);
  if (on && !registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 180 });
  if (!on && registered) await BackgroundTask.unregisterTaskAsync(TASK);
}
