import { PRAYERS } from '@/features/prayers/times';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SettingsSchema = z.object({
  mosqueId: z.string(),
  prayers: z.array(z.enum(PRAYERS)),
  minutesBefore: z.number(),
});
export type ReminderSettings = z.infer<typeof SettingsSchema>;

type RemindersState = ReminderSettings & { update: (patch: Partial<ReminderSettings>) => void };

export const useReminders = create<RemindersState>()(
  persist(
    (set) => ({
      mosqueId: 'suleymaniye',
      prayers: [],
      minutesBefore: 15,
      update: (patch) => set(patch),
    }),
    {
      name: 'reminders',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({ mosqueId, prayers, minutesBefore }) => ({ mosqueId, prayers, minutesBefore }),
      merge: (stored, current) => {
        const parsed = SettingsSchema.safeParse(stored);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
