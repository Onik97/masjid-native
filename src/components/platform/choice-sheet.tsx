import { THEME } from '@/lib/theme';
import { BottomSheet, Host, ListItem, Text } from '@expo/ui';

export type Choice<T> = { label: string; value: T };
export type ChoiceSheetProps<T> = {
  title: string;
  open: boolean;
  choices: Choice<T>[];
  value: T;
  /** Called with the picked value; the sheet closes itself through `onClose` right after. */
  onChoose: (value: T) => void;
  onClose: () => void;
  scheme: 'dark' | 'light';
};

/** Non-Android fallback: a sheet of rows with a check on the current one. */
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
    <Host colorScheme={scheme} style={{ position: 'absolute' }}>
      <BottomSheet isPresented={open} onDismiss={onClose} containerColor={t.card}>
        <Text textStyle={{ fontSize: 20, fontWeight: '600', color: t.foreground }}>{title}</Text>
        {choices.map((c) => (
          <ListItem
            key={String(c.value)}
            onPress={() => {
              onChoose(c.value);
              onClose();
            }}
            trailing={c.value === value ? <Text textStyle={{ color: t.foreground }}>✓</Text> : undefined}>
            <Text textStyle={{ color: t.foreground }}>{c.label}</Text>
          </ListItem>
        ))}
      </BottomSheet>
    </Host>
  );
}
