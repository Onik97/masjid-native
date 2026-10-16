import { useScheme } from '@/features/settings/store';
import { MATERIAL_SEED } from '@/lib/theme';
import { Host } from '@expo/ui';
import { FloatingActionButton, Icon } from '@expo/ui/jetpack-compose';
import type { AddFabProps } from './add-fab';

/** The Material 3 FAB, bottom-right, themed from the app's seed color. */
export function AddFab({ onPress, bottom, label }: AddFabProps) {
  const scheme = useScheme();
  return (
    <Host
      matchContents
      colorScheme={scheme}
      seedColor={MATERIAL_SEED}
      style={{ position: 'absolute', right: 16, bottom }}>
      <FloatingActionButton onClick={onPress}>
        <FloatingActionButton.Icon>
          <Icon source={require('../../../assets/icons/add.xml')} contentDescription={label} />
        </FloatingActionButton.Icon>
      </FloatingActionButton>
    </Host>
  );
}
