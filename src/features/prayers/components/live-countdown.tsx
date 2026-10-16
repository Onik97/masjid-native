import { Text } from '@/components/ui/text';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { View } from 'react-native';
import { countdown, formatCountdown, type Moment } from '../times';

type Props = { moment: Moment; live: boolean; onElapsed: () => void };

/**
 * "Iqamah in" over a big "15:24", ticking once a second inside this component only, so the rest
 * of the screen keeps re-rendering per minute. Tells the screen when it reaches zero.
 */
export function LiveCountdown({ moment, live, onElapsed }: Props) {
  const [now] = useNow(1000);
  const left = countdown(moment.at, now);
  const done = left.hours + left.minutes + left.seconds === 0;

  useEffect(() => {
    if (done) onElapsed();
  }, [done, onElapsed]);

  return (
    <View className="items-end">
      <Text className="text-muted-foreground text-xs font-medium">
        {moment.kind === 'athan' ? 'Athan in' : 'Iqamah in'}
      </Text>
      <Text
        className={cn(
          'text-[34px] leading-[40px] font-semibold tracking-tight tabular-nums',
          live && 'text-live',
        )}>
        {formatCountdown(left)}
      </Text>
    </View>
  );
}
