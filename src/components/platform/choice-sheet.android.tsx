import { MATERIAL_SEED, THEME } from '@/lib/theme';
import { BottomSheet, Host } from '@expo/ui';
import { Column, ListItem, RadioButton, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, padding, selectable, selectableGroup } from '@expo/ui/jetpack-compose/modifiers';
import type { ChoiceSheetProps } from './choice-sheet';

/**
 * Material 3 modal bottom sheet of radio rows, the Android way to pick one of a few values. The
 * sheet takes the app's card color; only the selected radio carries the brand orange.
 */
export function ChoiceSheet<T extends string | number>({
  title,
  open,
  choices,
  value,
  onChoose,
  onClose,
  scheme,
}: ChoiceSheetProps<T>) {
  const t = THEME[scheme];
  return (
    // Its own seeded Host: the sheet's built-in one is unseeded and would paint the radios purple.
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
        contentPadding={{ bottom: 16 }}>
        <Text style={{ typography: 'titleLarge' }} color={t.foreground} modifiers={[padding(16, 0, 16, 12)]}>
          {title}
        </Text>
        <Column modifiers={[fillMaxWidth(), selectableGroup()]}>
          {choices.map((c) => (
            <ListItem
              key={String(c.value)}
              colors={{ containerColor: t.card, contentColor: t.foreground }}
              modifiers={[
                fillMaxWidth(),
                selectable(
                  c.value === value,
                  () => {
                    onChoose(c.value);
                    onClose();
                  },
                  'radioButton',
                ),
              ]}>
              <ListItem.LeadingContent>
                <RadioButton
                  selected={c.value === value}
                  colors={{ selectedColor: MATERIAL_SEED, unselectedColor: t.mutedForeground }}
                />
              </ListItem.LeadingContent>
              <ListItem.HeadlineContent>
                <Text style={{ typography: 'bodyLarge' }}>{c.label}</Text>
              </ListItem.HeadlineContent>
            </ListItem>
          ))}
        </Column>
      </BottomSheet>
    </Host>
  );
}
