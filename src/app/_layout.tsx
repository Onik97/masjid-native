import '@/global.css';

import { ReminderSync } from '@/features/reminders/sync';
import { useDisplay, useScheme } from '@/features/settings/store';
import { persistOptions, queryClient } from '@/lib/query-client';
import { NAV_THEME, THEME } from '@/lib/theme';
import { PortalHost } from '@rn-primitives/portal';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Uniwind } from 'uniwind';

export { ErrorBoundary } from 'expo-router';

// Apply the saved theme before the first frame (the store reads from disk synchronously), then
// follow changes from Settings.
Uniwind.setTheme(useDisplay.getState().theme);
useDisplay.subscribe((s) => Uniwind.setTheme(s.theme));

export default function RootLayout() {
  const scheme = useScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {/* The platform's own top app bar on every screen: title, back, actions. */}
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: THEME[scheme].background },
              headerTintColor: THEME[scheme].foreground,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: THEME[scheme].background },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="add" options={{ title: 'Add mosque' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="nearby" options={{ title: 'Near you' }} />
          </Stack>
          <ReminderSync />
          <PortalHost />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
