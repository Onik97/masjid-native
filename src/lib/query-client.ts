import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { storage } from './storage';

// Timetables cover a month ahead, so a cache this old still holds today's times offline.
const KEEP_FOR = 20 * 24 * 3600_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    // Mosques edit times a few times a month; the API is edge-cached for 5 minutes.
    queries: { staleTime: 30 * 60_000, gcTime: KEEP_FOR },
  },
});

export const persistOptions = {
  persister: createSyncStoragePersister({ storage, key: 'query-cache' }),
  maxAge: KEEP_FOR,
};

// React Native has no window focus: refetch stale queries whenever the app comes back to the foreground.
AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
