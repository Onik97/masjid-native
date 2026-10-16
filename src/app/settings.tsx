import { ChoiceSheet, type Choice } from '@/components/platform/choice-sheet';
import { SettingSwitch } from '@/components/platform/setting-switch';
import { Text } from '@/components/ui/text';
import { useMosques } from '@/features/mosques/store';
import { PRAYERS, type Prayer } from '@/features/prayers/times';
import { allowNotifications } from '@/features/reminders/notifications';
import { useReminders } from '@/features/reminders/store';
import { useDisplay } from '@/features/settings/store';
import { Fragment, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LABELS: Record<Prayer, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr / Jumuah',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};
const THEMES: Choice<'dark' | 'light'>[] = [
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];
const LEADS: Choice<number>[] = [5, 10, 15, 20, 30].map((m) => ({ label: `${m} minutes before`, value: m }));

type Sheet = 'theme' | 'mosque' | 'lead';

/**
 * Settings as one grouped list, like the home screen's: every row names the setting and shows its
 * current value underneath, choices open a sheet of radio rows, and switch rows toggle on a tap
 * anywhere in the row.
 */
export default function Settings() {
  const { mosqueId, prayers, minutesBefore, update } = useReminders();
  const mosques = useMosques((s) => s.mosques);
  const { showAthan, setShowAthan, theme, setTheme } = useDisplay();
  const [sheet, setSheet] = useState<Sheet>();
  const [blocked, setBlocked] = useState(false);
  const insets = useSafeAreaInsets();
  // The reminder mosque may have been removed; reminders pause until another is chosen.
  const mosque = mosques.find((m) => m.id === mosqueId);
  const close = () => setSheet(undefined);

  async function togglePrayer(p: Prayer, on: boolean) {
    if (on && !(await allowNotifications())) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    update({ prayers: on ? [...prayers, p] : prayers.filter((x) => x !== p) });
  }

  return (
    <View className="bg-background flex-1">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }}>
        <Label first>Display</Label>
        <Group>
          <Row
            title="Theme"
            summary={theme === 'dark' ? 'Dark' : 'Light'}
            onPress={() => setSheet('theme')}
          />
          <SwitchRow
            title="Athan times"
            summary={showAthan ? 'Shown beside iqamah' : 'Iqamah only'}
            value={showAthan}
            onChange={setShowAthan}
            scheme={theme}
          />
        </Group>

        <Label>Iqamah reminders</Label>
        <Group>
          <Row
            title="Mosque"
            summary={mosque?.name ?? 'Choose one to get reminders'}
            onPress={() => setSheet('mosque')}
          />
          <Row
            title="How early"
            summary={`${minutesBefore} minutes before iqamah`}
            onPress={() => setSheet('lead')}
          />
        </Group>

        <Label>Remind me for</Label>
        <Group>
          {PRAYERS.map((p) => (
            <SwitchRow
              key={p}
              title={LABELS[p]}
              value={prayers.includes(p)}
              onChange={(on) => togglePrayer(p, on)}
              scheme={theme}
            />
          ))}
        </Group>
        {blocked && (
          <Text
            selectable
            onPress={() => Linking.openSettings()}
            className="text-destructive mt-3 px-6 text-sm">
            Notifications are off for this app. Tap to open Settings.
          </Text>
        )}
      </ScrollView>

      <ChoiceSheet
        title="Theme"
        open={sheet === 'theme'}
        choices={THEMES}
        value={theme}
        onChoose={setTheme}
        onClose={close}
        scheme={theme}
      />
      <ChoiceSheet
        title="Reminder mosque"
        open={sheet === 'mosque'}
        choices={mosques.map((m) => ({ label: m.name, value: m.id }))}
        value={mosque?.id ?? ''}
        onChoose={(id) => update({ mosqueId: id })}
        onClose={close}
        scheme={theme}
      />
      <ChoiceSheet
        title="How early"
        open={sheet === 'lead'}
        choices={LEADS}
        value={minutesBefore}
        onChoose={(m) => update({ minutesBefore: m })}
        onClose={close}
        scheme={theme}
      />
    </View>
  );
}

function Label({ first, children }: { first?: boolean; children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className={`text-muted-foreground ${first ? 'mt-2' : 'mt-8'} mb-2 px-6 text-sm font-medium`}>
      {children}
    </Text>
  );
}

/** One rounded surface per topic, rows split by inset hairlines (the home list's grouping). */
function Group({ children }: { children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children.flat() : [children];
  return (
    <View className="bg-card mx-4 overflow-hidden rounded-3xl">
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View className="bg-border h-hairline ml-5" />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  summary?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  accessibility?: Pick<React.ComponentProps<typeof Pressable>, 'accessibilityRole' | 'accessibilityState'>;
};

function Row({ title, summary, onPress, trailing, accessibility }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ foreground: true }}
      accessibilityRole="button"
      {...accessibility}
      className="min-h-16 flex-row items-center gap-4 px-5 py-3">
      <View className="flex-1">
        <Text className="text-base">{title}</Text>
        {summary && <Text className="text-muted-foreground mt-0.5 text-sm">{summary}</Text>}
      </View>
      {trailing}
    </Pressable>
  );
}

type SwitchRowProps = {
  title: string;
  summary?: string;
  value: boolean;
  onChange: (on: boolean) => void;
  scheme: 'dark' | 'light';
};

function SwitchRow({ title, summary, value, onChange, scheme }: SwitchRowProps) {
  return (
    <Row
      title={title}
      summary={summary}
      onPress={() => onChange(!value)}
      accessibility={{ accessibilityRole: 'switch', accessibilityState: { checked: value } }}
      trailing={
        // The row already announces itself as the switch; the control is only its picture.
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <SettingSwitch value={value} onChange={onChange} scheme={scheme} />
        </View>
      }
    />
  );
}
