import { useScheme } from '@/features/settings/store';
import { MATERIAL_SEED } from '@/lib/theme';
import { Host } from '@expo/ui';
import { SnackbarHost, type SnackbarHostRef } from '@expo/ui/jetpack-compose';
import { useImperativeHandle, useRef } from 'react';
import type { UndoSnackbarProps } from './undo-snackbar';

/** Material 3 snackbar with an Undo action; `show` resolves true when Undo was tapped. */
export function UndoSnackbar({ ref, bottom }: UndoSnackbarProps) {
  const scheme = useScheme();
  const host = useRef<SnackbarHostRef>(null);
  useImperativeHandle(ref, () => ({
    show: async (message) =>
      (await host.current?.showSnackbar({ message, actionLabel: 'Undo', duration: 'long' })) ===
      'actionPerformed',
  }));
  return (
    <Host
      colorScheme={scheme}
      seedColor={MATERIAL_SEED}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom, height: 96 }}>
      <SnackbarHost ref={host} />
    </Host>
  );
}
