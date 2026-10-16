import { storage } from '@/lib/storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const DisplaySchema = z.object({
  showAthan: z.boolean(),
  theme: z.enum(['dark', 'light']).default('dark'),
});

type DisplayState = z.infer<typeof DisplaySchema> & {
  setShowAthan: (on: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
};

/**
 * How the app reads: athan times or iqamah only, and dark or light. Dark is the default; the
 * stored value predates the theme field for early installs, hence the schema default.
 */
export const useDisplay = create<DisplayState>()(
  persist(
    (set) => ({
      showAthan: true,
      theme: 'dark',
      setShowAthan: (showAthan) => set({ showAthan }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'display',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: ({ showAthan, theme }) => ({ showAthan, theme }),
      merge: (stored, current) => {
        const parsed = DisplaySchema.safeParse(stored);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);

/** The active color scheme, for native pieces that can't read the CSS theme. */
export const useScheme = () => useDisplay((s) => s.theme);
