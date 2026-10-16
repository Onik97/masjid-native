import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Trash2Icon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// How far a flick would carry the card after release (px/s × 0.2s), so a quick flick commits too.
function project(velocity: number) {
  'worklet';
  return velocity * 0.2;
}

type Props = { label: string; onRemove: () => void; enabled: boolean; children: React.ReactNode };

/** Swipe left past ~40% of the width (or flick left) to remove; anything less springs back. */
export function SwipeToRemove({ label, onRemove, enabled, children }: Props) {
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const [width, setWidth] = useState(1);

  const pan = usePanGesture({
    enabled,
    // Declare the axis, or the card steals the page's vertical scroll.
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onActivate: () => {
      'worklet';
      start.set(x.get());
    },
    onUpdate: (e) => {
      'worklet';
      const next = start.get() + e.translationX;
      // Rubber-band instead of a hard stop when dragged the wrong way.
      x.set(next > 0 ? next / 4 : next);
    },
    onDeactivate: (e) => {
      'worklet';
      if (x.get() + project(e.velocityX) < -width * 0.4) {
        x.set(
          withTiming(
            -width,
            { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System },
            (done) => {
              if (done) scheduleOnRN(onRemove);
            },
          ),
        );
        return;
      }
      x.set(
        withSpring(0, {
          duration: 300,
          dampingRatio: 1,
          velocity: e.velocityX,
          reduceMotion: ReduceMotion.System,
        }),
      );
    },
  });

  const card = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const behind = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [-80, 0], [1, 0], 'clamp') }));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View
        style={behind}
        className="bg-destructive absolute inset-0 flex-row items-center justify-end gap-2 px-5"
        accessibilityElementsHidden>
        <Text className="font-semibold text-white">Remove {label}</Text>
        <Icon as={Trash2Icon} className="size-5 text-white" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={card} className="bg-card">
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
