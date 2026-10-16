import { SourceSchema } from '@/features/masjidbox/api';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MosqueSchema = z.object({ id: z.string(), name: z.string(), source: SourceSchema });
export type Mosque = z.infer<typeof MosqueSchema>;

const DEFAULT_MOSQUES: Mosque[] = [
  { id: 'suleymaniye', name: 'Suleymaniye', source: { key: 'PxlRvTyAKL9BxvCG_zoqR' } },
  { id: 'sahabah', name: 'Sahabah', source: { key: 'qr5YbXShClECg8qrrg9sa' } },
];

type MosquesState = {
  mosques: Mosque[];
  /** Adds a mosque, at `index` when restoring one that was just removed. */
  add: (mosque: Mosque, index?: number) => void;
  remove: (id: string) => void;
  /** Moves the mosque at `from` to `to`, for drag-to-reorder. */
  move: (from: number, to: number) => void;
};

export const useMosques = create<MosquesState>()(
  persist(
    (set) => ({
      mosques: DEFAULT_MOSQUES,
      add: (mosque, index) =>
        set((s) => {
          const rest = s.mosques.filter((m) => m.id !== mosque.id);
          const at = index ?? rest.length;
          return { mosques: [...rest.slice(0, at), mosque, ...rest.slice(at)] };
        }),
      // The list never empties: the screen and reminders always need at least one mosque.
      remove: (id) =>
        set((s) => (s.mosques.length > 1 ? { mosques: s.mosques.filter((m) => m.id !== id) } : s)),
      move: (from, to) =>
        set((s) => {
          const next = s.mosques.slice();
          next.splice(to, 0, ...next.splice(from, 1));
          return { mosques: next };
        }),
    }),
    {
      name: 'mosques',
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ mosques: s.mosques }),
      // Stored JSON is untrusted: fall back to the defaults rather than render a malformed list.
      merge: (stored, current) => {
        const parsed = z.object({ mosques: z.array(MosqueSchema) }).safeParse(stored);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
    },
  ),
);
