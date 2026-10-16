import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type BaseAnimationBuilder,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { dropIndex, dropOffset } from '@/lib/reorder';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SETTLE = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
export type Drag = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  y: SharedValue<number>;
  heights: SharedValue<number[]>;
};

/** Shared drag state for one list; pass it to every `DragToReorder` row. */
export function useDrag(): Drag {
  return {
    from: useSharedValue(-1),
    to: useSharedValue(-1),
    y: useSharedValue(0),
    heights: useSharedValue<number[]>([]),
  };
}

/** Puts every row back in place, once the list has re-rendered in its new order. */
export function endDrag(drag: Drag) {
  drag.from.set(-1);
  drag.to.set(-1);
  drag.y.set(0);
}

type Props = {
  index: number;
  /** Rows in the list; the measured heights can outlive a removed row. */
  count: number;
  drag: Drag;
  enabled: boolean;
  /** Called on release; `from === to` when the row was put back where it was. */
  onMove: (from: number, to: number) => void;
  onLift: () => void;
  /** Translucent tint laid over the row while it is held. */
  tint: string;
  layout?: BaseAnimationBuilder | typeof BaseAnimationBuilder;
  className?: string;
  children: React.ReactNode;
};

/**
 * Hold a row, then drag it up or down: it lifts, the rows it passes slide out of its way, and on
 * release it settles into the open slot. Screen readers get Move up / Move down actions instead.
 */
export function DragToReorder({
  index,
  tint,
  count,
  drag,
  enabled,
  onMove,
  onLift,
  layout,
  className,
  children,
}: Props) {
  const { from, to, y, heights } = drag;

  const pan = usePanGesture({
    enabled,
    // Android's long-press delay: a quick vertical swipe still scrolls the page, a horizontal one
    // still swipes the row away.
    activateAfterLongPress: 400,
    onActivate: () => {
      'worklet';
      from.set(index);
      to.set(index);
      y.set(0);
      scheduleOnRN(onLift);
    },
    onUpdate: (e) => {
      'worklet';
      // Kept inside the group: past its ends there is no slot to drop into.
      const h = heights.get().slice(0, count);
      const dy = Math.min(Math.max(e.translationY, dropOffset(h, index, 0)), dropOffset(h, index, count - 1));
      y.set(dy);
      to.set(dropIndex(h, index, dy));
    },
    onDeactivate: () => {
      'worklet';
      const target = to.get();
      y.set(
        withTiming(dropOffset(heights.get(), index, target), SETTLE, (done) => {
          if (done) scheduleOnRN(onMove, index, target);
        }),
      );
    },
  });

  const style = useAnimatedStyle(() => {
    const dragged = from.get();
    if (dragged === index) {
      // Held: on top of its neighbours, following the finger.
      return { zIndex: 1, transform: [{ translateY: y.get() }] };
    }
    if (dragged < 0) return { zIndex: 0, transform: [{ translateY: 0 }] };
    // Rows between the held row's old and new slot step aside by its height.
    const target = to.get();
    const h = heights.get()[dragged] ?? 0;
    const step = dragged < index && index <= target ? -1 : target <= index && index < dragged ? 1 : 0;
    return {
      zIndex: 0,
      transform: [{ translateY: withTiming(step * h, SETTLE) }],
    };
  });

  // The held row takes a tint, so it reads as picked up.
  const held = useAnimatedStyle(() => ({ opacity: withTiming(from.get() === index ? 1 : 0, SETTLE) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        layout={layout}
        style={style}
        className={className}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          heights.modify((all) => {
            'worklet';
            all[index] = h;
            return all;
          });
        }}
        accessibilityActions={[
          { name: 'moveUp', label: 'Move up' },
          { name: 'moveDown', label: 'Move down' },
        ]}
        onAccessibilityAction={(e) => {
          const next = index + (e.nativeEvent.actionName === 'moveUp' ? -1 : 1);
          if (enabled && next >= 0 && next < count) onMove(index, next);
        }}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: tint },
            held,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}
