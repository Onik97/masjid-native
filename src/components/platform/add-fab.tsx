import { PressFeedback } from '@/components/press-feedback';
import { Icon } from '@/components/ui/icon';
import { PlusIcon } from 'lucide-react-native';

export type AddFabProps = { onPress: () => void; bottom: number; label: string };

/** Non-Android fallback for the add button; Android uses the Material FAB (add-fab.android.tsx). */
export function AddFab({ onPress, bottom, label }: AddFabProps) {
  return (
    <PressFeedback
      accessibilityLabel={label}
      onPress={onPress}
      style={{ position: 'absolute', right: 16, bottom }}
      className="bg-action size-14 items-center justify-center rounded-2xl">
      <Icon as={PlusIcon} className="size-6 text-white" />
    </PressFeedback>
  );
}
