import { PrayerTabs } from '@/features/prayers/components/prayer-tabs';
import type { Prayer } from '@/features/prayers/times';

export type PrayerSelectorProps = {
  tabs: { prayer: Prayer; label: string }[];
  value: Prayer;
  onChange: (prayer: Prayer) => void;
};

/** Non-Android fallback; Android renders Material 3 segmented buttons (prayer-selector.android.tsx). */
export function PrayerSelector(props: PrayerSelectorProps) {
  return <PrayerTabs {...props} />;
}
