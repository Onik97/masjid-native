import { MATERIAL_SEED, THEME } from '@/lib/theme';
import { Host } from '@expo/ui';
import { Switch } from '@expo/ui/jetpack-compose';
import type { SettingSwitchProps } from './setting-switch';

/**
 * The Material 3 switch in the app's own colors: neutral grey when off (the seeded palette tints
 * it pink against the white cards), the brand orange when on.
 */
export function SettingSwitch({ value, onChange, scheme }: SettingSwitchProps) {
  const t = THEME[scheme];
  return (
    <Host matchContents colorScheme={scheme}>
      <Switch
        value={value}
        onCheckedChange={onChange}
        colors={{
          checkedTrackColor: MATERIAL_SEED,
          checkedThumbColor: '#ffffff',
          checkedBorderColor: MATERIAL_SEED,
          uncheckedTrackColor: t.border,
          uncheckedThumbColor: t.mutedForeground,
          uncheckedBorderColor: t.mutedForeground,
        }}
      />
    </Host>
  );
}
