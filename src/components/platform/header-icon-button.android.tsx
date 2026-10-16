import { useScheme } from '@/features/settings/store';
import { MATERIAL_SEED } from '@/lib/theme';
import { Host } from '@expo/ui';
import { Icon, IconButton } from '@expo/ui/jetpack-compose';
import type { HeaderIconButtonProps } from './header-icon-button';

const ICONS = {
  notifications: require('../../../assets/icons/notifications.xml'),
  settings: require('../../../assets/icons/settings.xml'),
};

/** A Material 3 icon button for the top app bar. */
export function HeaderIconButton({ icon, label, onPress }: HeaderIconButtonProps) {
  const scheme = useScheme();
  return (
    <Host matchContents colorScheme={scheme} seedColor={MATERIAL_SEED}>
      <IconButton onClick={onPress}>
        <Icon source={ICONS[icon]} contentDescription={label} />
      </IconButton>
    </Host>
  );
}
