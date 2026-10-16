import { DragToReorder, endDrag, useDrag } from '@/components/drag-to-reorder';
import { AddFab } from '@/components/platform/add-fab';
import { HeaderIconButton } from '@/components/platform/header-icon-button';
import { PrayerSelector } from '@/components/platform/prayer-selector';
import { UndoSnackbar, type UndoSnackbarHandle } from '@/components/platform/undo-snackbar';
import { SwipeToRemove } from '@/components/swipe-to-remove';
import { Text } from '@/components/ui/text';
import { useMosques } from '@/features/mosques/store';
import { MosqueRow } from '@/features/prayers/components/mosque-row';
import { useTimetables } from '@/features/prayers/queries';
import {
  clock,
  dayOn,
  focus,
  localDate,
  nextMoment,
  PRAYERS,
  slot,
  type Prayer,
} from '@/features/prayers/times';
import { useDisplay, useScheme } from '@/features/settings/store';
import { THEME } from '@/lib/theme';
import { useNow } from '@/lib/use-now';
import { router, Stack } from 'expo-router';
import { useLayoutEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const dateLine = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

// Built once at module scope: a builder made during render is rebuilt on every render.
const CLOSE_GAP = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);

export default function Home() {
  const { mosques, add, remove, move } = useMosques();
  const results = useTimetables(mosques);
  const [now, refreshNow] = useNow();
  const insets = useSafeAreaInsets();
  const snackbar = useRef<UndoSnackbarHandle>(null);
  const drag = useDrag();
  // The gap-closing layout animation is off while a row is held, or the drop would animate twice.
  const [reordering, setReordering] = useState(false);
  // Rows drop their drag offsets only once the list has re-rendered in its new order.
  useLayoutEffect(() => {
    endDrag(drag);
    setReordering(false);
  }, [mosques]);

  // The screen follows the next prayer until the user picks one; a new "next" resets their pick.
  const auto = focus(
    results.map((r) => r.data?.days ?? []),
    now,
  );
  const autoKey = `${auto.date}/${auto.prayer}`;
  const [picked, setPicked] = useState<{ prayer: Prayer; for: string }>();
  const prayer = picked?.for === autoKey ? picked.prayer : auto.prayer;

  const days = results.map((r) => r.data && dayOn(r.data.days, auto.date));
  const first = days.find(Boolean);
  const tabs = first
    ? PRAYERS.map((p) => ({ prayer: p, label: slot(first, p).label }))
    : PRAYERS.map((p) => ({ prayer: p, label: p[0].toUpperCase() + p.slice(1) }));

  const showAthan = useDisplay((s) => s.showAthan);
  const theme = THEME[useScheme()];
  // What the countdown aims at: the soonest moment still ahead for the selected prayer across all
  // mosques (an athan only when athan times are shown).
  const target = mosques
    .flatMap((mosque, i) => {
      const moment = days[i] && nextMoment(slot(days[i], prayer), now, showAthan);
      return moment ? [{ mosque, ...moment }] : [];
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];

  function moveMosque(from: number, to: number) {
    if (from !== to) return move(from, to);
    endDrag(drag);
    setReordering(false);
  }

  async function removeMosque(index: number) {
    const mosque = mosques[index];
    remove(mosque.id);
    if (await snackbar.current?.show(`Removed ${mosque.name}`)) add(mosque, index);
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: auto.date === localDate(now) ? 'Today' : 'Tomorrow',
          headerRight: () => (
            <HeaderIconButton icon="settings" label="Settings" onPress={() => router.push('/settings')} />
          ),
        }}
      />
      {/* A handful of mosques: a plain scroll view, not a virtualized list (whose animated cell
          wrappers also swallowed the row swipe). */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl
            refreshing={results.some((r) => r.isRefetching)}
            onRefresh={() => results.forEach((r) => r.refetch())}
          />
        }>
        <View className="pt-2 pb-2">
          <Text className="text-muted-foreground px-5 text-center text-base">
            {dateLine.format(new Date(`${auto.date}T12:00:00Z`))}
            {first ? ` · ${first.hijri.dayOfMonth} ${first.hijri.monthISO}` : ''}
          </Text>
          <View className="mt-4">
            <PrayerSelector
              tabs={tabs}
              value={prayer}
              onChange={(p) => setPicked({ prayer: p, for: autoKey })}
            />
          </View>
          <Text className="text-muted-foreground mt-8 mb-2 px-6 text-sm font-medium">Mosques</Text>
        </View>
        {/* One clipped group, so the rounded ends stay put while rows move inside it. */}
        <Animated.View layout={CLOSE_GAP} className="bg-card mx-4 overflow-hidden rounded-3xl">
          {mosques.map((m, i) => (
            <DragToReorder
              key={m.id}
              index={i}
              count={mosques.length}
              drag={drag}
              enabled={mosques.length > 1}
              onLift={() => setReordering(true)}
              onMove={moveMosque}
              layout={reordering ? undefined : CLOSE_GAP}
              tint={theme.held}>
              {i > 0 && <View className="bg-border h-hairline ml-5" />}
              <SwipeToRemove label={m.name} enabled={mosques.length > 1} onRemove={() => removeMosque(i)}>
                <MosqueRow
                  name={m.name}
                  day={days[i]}
                  prayer={prayer}
                  now={now}
                  showAthan={showAthan}
                  target={target}
                  onElapsed={refreshNow}
                  status={
                    results[i].isPending
                      ? 'Loading times…'
                      : (results[i].error?.message ?? 'No times for this day')
                  }
                />
              </SwipeToRemove>
            </DragToReorder>
          ))}
        </Animated.View>
      </ScrollView>
      <UndoSnackbar ref={snackbar} bottom={insets.bottom + 96} />
      <AddFab label="Add a mosque" bottom={insets.bottom + 16} onPress={() => router.push('/add')} />
    </View>
  );
}
