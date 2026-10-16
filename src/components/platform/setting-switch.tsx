import { MATERIAL_SEED } from '@/lib/theme';
import { Host, Switch } from '@expo/ui';

export type SettingSwitchProps = {
  value: boolean;
  onChange: (on: boolean) => void;
  scheme: 'dark' | 'light';
};

/** Non-Android fallback: the platform switch as it comes. */
export function SettingSwitch({ value, onChange, scheme }: SettingSwitchProps) {
  return (
    <Host matchContents colorScheme={scheme} seedColor={MATERIAL_SEED}>
      <Switch value={value} onValueChange={onChange} />
    </Host>
  );
}
