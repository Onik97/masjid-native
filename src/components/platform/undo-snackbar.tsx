import { PressFeedback } from '@/components/press-feedback';
import { Text } from '@/components/ui/text';
import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export type UndoSnackbarHandle = { show: (message: string) => Promise<boolean> };
export type UndoSnackbarProps = { ref: Ref<UndoSnackbarHandle>; bottom: number };

const SHOW_FOR_MS = 8000;

/** Non-Android fallback snackbar; Android uses Material 3's (undo-snackbar.android.tsx). */
export function UndoSnackbar({ ref, bottom }: UndoSnackbarProps) {
  const [message, setMessage] = useState<string>();
  const settle = useRef<(undo: boolean) => void>(undefined);

  useImperativeHandle(ref, () => ({
    show: (next) =>
      new Promise<boolean>((resolve) => {
        settle.current?.(false);
        const timer = setTimeout(() => finish(false), SHOW_FOR_MS);
        const finish = (undo: boolean) => {
          clearTimeout(timer);
          settle.current = undefined;
          setMessage(undefined);
          resolve(undo);
        };
        settle.current = finish;
        setMessage(next);
      }),
  }));

  if (!message) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      style={{ position: 'absolute', left: 16, right: 88, bottom }}
      className="bg-card h-14 flex-row items-center rounded-xl pl-4">
      <Text numberOfLines={1} className="flex-1 text-base">
        {message}
      </Text>
      <PressFeedback onPress={() => settle.current?.(true)} className="h-14 justify-center px-4">
        <Text className="text-action text-base font-bold">Undo</Text>
      </PressFeedback>
    </Animated.View>
  );
}
