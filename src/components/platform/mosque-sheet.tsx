import { THEME } from '@/lib/theme';
import { BottomSheet, Button, Host, Text } from '@expo/ui';

export type MosqueSheetProps = {
  open: boolean;
  name: string;
  /** What Masjid Box has for this mosque, or why there's nothing to add. */
  detail: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
  onClose: () => void;
  scheme: 'dark' | 'light';
};

/** Non-Android fallback: the tapped mosque, its Masjid Box match and one action. */
export function MosqueSheet({ open, name, detail, action, onClose, scheme }: MosqueSheetProps) {
  const t = THEME[scheme];
  return (
    <Host colorScheme={scheme} style={{ position: 'absolute' }}>
      <BottomSheet isPresented={open} onDismiss={onClose} containerColor={t.card}>
        <Text textStyle={{ fontSize: 20, fontWeight: '600', color: t.foreground }}>{name}</Text>
        <Text textStyle={{ color: t.mutedForeground }}>{detail}</Text>
        {action && <Button label={action.label} onPress={action.onPress} />}
      </BottomSheet>
    </Host>
  );
}
