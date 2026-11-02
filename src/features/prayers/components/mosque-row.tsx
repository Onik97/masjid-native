import { Text } from '@/components/ui/text';
import type { Day } from '@/features/masjidbox/api';
import { cn } from '@/lib/utils';
import { View } from 'react-native';
import { clock, nextMoment, slot, type Moment, type Prayer } from '../times';
import { LiveCountdown } from './live-countdown';

type Props = {
  name: string;
  day: Day | undefined;
  prayer: Prayer;
  now: Date;
  showAthan: boolean;
  /** The soonest moment ahead across all mosques; anything happening at that time goes live green. */
  target: Moment | undefined;
  /** Shown instead of times while loading or after a failed fetch with nothing cached. */
  status: string;
  /** Called when this row's countdown reaches zero, so the screen can move on. */
  onElapsed: () => void;
};

/**
 * One mosque in the grouped list: name with its times underneath on the left, and a live
 * countdown to the next one on the right.
 */
export function MosqueRow({ name, day, prayer, now, showAthan, target, status, onElapsed }: Props) {
  if (!day) {
    return (
      <View className="min-h-20 justify-center px-5 py-4">
        <Text numberOfLines={1} className="text-lg">
          {name}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-sm">{status}</Text>
      </View>
    );
  }

  const s = slot(day, prayer);
  const passed = Date.parse(s.iqamah) <= now.getTime();
  const moment = nextMoment(s, now, showAthan);

  return (
    <View className="min-h-20 flex-row items-center gap-4 px-5 py-4">
      <View className="flex-1">
        {/* Long single-word names hyphenate ("Suleyma-niye") rather than break mid-word. */}
        <Text
          numberOfLines={2}
          android_hyphenationFrequency="normal"
          className={cn('text-lg', passed && 'text-muted-foreground')}>
          {name}
        </Text>
        <Text selectable className="text-muted-foreground mt-0.5 text-sm tabular-nums">
          {showAthan ? `Athan ${clock(s.athan)}\nIqamah ${clock(s.iqamah)}` : `Iqamah ${clock(s.iqamah)}`}
        </Text>
      </View>
      {moment ? (
        <LiveCountdown moment={moment} live={target?.at === moment.at} onElapsed={onElapsed} />
      ) : (
        <Text className="text-muted-foreground text-base">Passed</Text>
      )}
    </View>
  );
}
