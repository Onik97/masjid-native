import { PrayerTabs } from '@/features/prayers/components/prayer-tabs';
import type { Prayer } from '@/features/prayers/times';
import { useScheme } from '@/features/settings/store';
import { MATERIAL_SEED } from '@/lib/theme';
import { Host } from '@expo/ui';
import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { PixelRatio, useWindowDimensions } from 'react-native';
import type { PrayerSelectorProps } from './prayer-selector';

/** Material 3 segmented buttons: all five prayers in one row. */
export function PrayerSelector({ tabs, value, onChange }: PrayerSelectorProps) {
  const scheme = useScheme();
  const { width } = useWindowDimensions();
  // Equal-width segments squeeze the selected label against its edge once the check icon is
  // added (measured at 411dp: "Maghrib" ~50dp + 26dp icon + 24dp padding > a 76dp segment). When
  // the longest label can't fit selected, a scrolling row keeps every label whole without
  // capping the user's font size.
  const longest = Math.max(...tabs.map((t) => t.label.length));
  const fits = longest * 14 * 0.51 * PixelRatio.getFontScale() + 50 <= (width - 32) / tabs.length;
  if (!fits) return <PrayerTabs tabs={tabs} value={value} onChange={onChange} />;
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={scheme}
      seedColor={MATERIAL_SEED}
      style={{ marginHorizontal: 16 }}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        {tabs.map((t) => (
          <SegmentedButton
            key={t.prayer}
            selected={t.prayer === value}
            onClick={() => onChange(t.prayer as Prayer)}>
            <SegmentedButton.Label>
              <Text maxLines={1}>{t.label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
