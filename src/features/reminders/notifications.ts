import * as Notifications from 'expo-notifications';
import type { Reminder } from './plan';

// Android fixes a channel's sound once it exists, so going silent needed a new channel id; the
// old, noisy one is deleted.
const CHANNEL = 'iqamah-silent';
const OLD_CHANNEL = 'iqamah';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Reminders pop up and vibrate but make no sound. */
async function ensureChannel() {
  await Notifications.deleteNotificationChannelAsync(OLD_CHANNEL);
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Iqamah reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
  });
}

/** Asks for notification permission; Android only shows the prompt once a channel exists. */
export async function allowNotifications(): Promise<boolean> {
  await ensureChannel();
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let queue = Promise.resolve();

// Replaces every alarm on each call: at most ten (five prayers, today and tomorrow).
/** Replaces all scheduled reminders. Calls run one at a time so overlapping updates can't interleave. */
export function replaceReminders(reminders: Reminder[]) {
  queue = queue.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!reminders.length || !(await Notifications.getPermissionsAsync()).granted) return;
    // Phones that scheduled reminders before the silent channel existed move over here.
    await ensureChannel();
    for (const r of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      });
    }
  });
  return queue;
}
