import { PressFeedback } from '@/components/press-feedback';
import { Icon } from '@/components/ui/icon';
import { BellIcon, SettingsIcon } from 'lucide-react-native';

export type HeaderIconButtonProps = {
  icon: 'notifications' | 'settings';
  label: string;
  onPress: () => void;
};

const ICONS = { notifications: BellIcon, settings: SettingsIcon };

/** Non-Android fallback; Android uses a Material 3 icon button (header-icon-button.android.tsx). */
export function HeaderIconButton({ icon, label, onPress }: HeaderIconButtonProps) {
  return (
    <PressFeedback
      accessibilityLabel={label}
      onPress={onPress}
      className="size-12 items-center justify-center">
      <Icon as={ICONS[icon]} className="text-foreground size-6" />
    </PressFeedback>
  );
}
