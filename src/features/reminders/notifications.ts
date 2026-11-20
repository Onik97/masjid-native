import { requireOptionalNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import type { Reminder } from './plan';

// Android fixes a channel's sound and vibration once it exists, so each change needs a new
// channel id; the old ones are deleted.
const CHANNEL = 'iqamah-buzz';
const OLD_CHANNELS = ['iqamah', 'iqamah-silent'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Reminders pop up and buzz once but make no sound. */
async function ensureChannel() {
  for (const id of OLD_CHANNELS) await Notifications.deleteNotificationChannelAsync(id);
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Iqamah reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
    vibrationPattern: [0, 250],
  });
}

/** Asks for notification permission; Android only shows the prompt once a channel exists. */
export async function allowNotifications(): Promise<boolean> {
  await ensureChannel();
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Android: shows each reminder as a live countdown to the iqamah (modules/iqamah-countdown).
const countdown = requireOptionalNativeModule<{ replace(reminders: Reminder[]): void }>('IqamahCountdown');

let queue = Promise.resolve();

// Replaces every alarm on each call: at most ten (five prayers, today and tomorrow).
/** Replaces all scheduled reminders. Calls run one at a time so overlapping updates can't interleave. */
export function replaceReminders(reminders: Reminder[]) {
  queue = queue.then(async () => {
    // Also clears reminders that builds before the countdown scheduled here.
    await Notifications.cancelAllScheduledNotificationsAsync();
    const allowed = reminders.length > 0 && (await Notifications.getPermissionsAsync()).granted;
    // Phones that scheduled reminders on an older channel move over here.
    if (allowed) await ensureChannel();
    if (countdown) {
      countdown.replace(allowed ? reminders : []);
      return;
    }
    if (!allowed) return;
    for (const r of reminders.filter((r) => r.at > Date.now())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      });
    }
  });
  return queue;
}
