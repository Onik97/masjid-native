import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

type Props = Omit<PressableProps, 'children'> & { className?: string; children: React.ReactNode };

const android = process.env.EXPO_OS === 'android';

/**
 * Each platform's own press feedback: the Material ripple on Android, a 0.97 sink on iOS (a
 * ripple there would be the other platform's costume). For buttons only; list rows highlight.
 */
export function PressFeedback({ className, children, onPressIn, onPressOut, ...props }: Props) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...props}
      pressRetentionOffset={16}
      android_ripple={{ borderless: true, foreground: true }}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}>
      <Animated.View
        className={className}
        style={
          android
            ? undefined
            : {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                transitionProperty: 'transform',
                transitionDuration: 120,
                transitionTimingFunction: 'ease-out',
              }
        }>
        {children}
      </Animated.View>
    </Pressable>
  );
}
