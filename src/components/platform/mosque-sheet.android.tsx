import { MATERIAL_SEED, THEME } from '@/lib/theme';
import { BottomSheet, Host } from '@expo/ui';
import { Button, Column, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import type { MosqueSheetProps } from './mosque-sheet';

/** Material 3 modal bottom sheet for a tapped mosque: name, its Masjid Box match, one filled action. */
export function MosqueSheet({ open, name, detail, action, onClose, scheme }: MosqueSheetProps) {
  const t = THEME[scheme];
  return (
    // Its own seeded Host, as in ChoiceSheet: the sheet's built-in one is unseeded.
    <Host
      colorScheme={scheme}
      seedColor={MATERIAL_SEED}
      style={{ position: 'absolute' }}
      pointerEvents="none">
      <BottomSheet
        isPresented={open}
        onDismiss={onClose}
        containerColor={t.card}
        contentColor={t.foreground}
        contentPadding={{ bottom: 24 }}>
        <Column modifiers={[fillMaxWidth(), padding(24, 0, 24, 0)]}>
          <Text style={{ typography: 'titleLarge' }} color={t.foreground}>
            {name}
          </Text>
          <Text
            style={{ typography: 'bodyMedium' }}
            color={t.mutedForeground}
            modifiers={[padding(0, 4, 0, 20)]}>
            {detail}
          </Text>
          {action && (
            <Button
              onClick={action.onPress}
              enabled={!action.disabled}
              colors={{ containerColor: MATERIAL_SEED, contentColor: '#FFFFFF' }}
              modifiers={[fillMaxWidth()]}>
              <Text>{action.label}</Text>
            </Button>
          )}
        </Column>
      </BottomSheet>
    </Host>
  );
}
