import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useEffect, useRef, type ComponentRef } from 'react';
import { ScrollView } from 'react-native';
import type { Prayer } from '../times';

type Props = {
  tabs: { prayer: Prayer; label: string }[];
  value: Prayer;
  onChange: (prayer: Prayer) => void;
};

/**
 * All five prayers as one full-width segmented row. It only scrolls when the system font size is
 * so large the row can't fit, because capping the user's font scale would be the wrong fix.
 */
export function PrayerTabs({ tabs, value, onChange }: Props) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<Partial<Record<Prayer, number>>>({});
  // Only matters when the row overflows: keep the selected prayer on screen.
  const reveal = (x: number) => scroller.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  useEffect(() => {
    const x = offsets.current[value];
    if (x !== undefined) reveal(x);
  }, [value]);

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Prayer)}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        contentContainerClassName="px-4">
        <TabsList className="bg-card mr-0 h-auto flex-1 justify-between rounded-full p-1">
          {tabs.map((t) => {
            const selected = t.prayer === value;
            return (
              <TabsTrigger
                key={t.prayer}
                value={t.prayer}
                onLayout={(e) => {
                  offsets.current[t.prayer] = e.nativeEvent.layout.x;
                  if (selected) reveal(e.nativeEvent.layout.x);
                }}
                className={cn(
                  'min-h-12 flex-1 rounded-full border-0 px-2 dark:border-transparent',
                  selected ? 'bg-foreground dark:bg-foreground' : 'bg-transparent dark:bg-transparent',
                )}>
                <Text
                  numberOfLines={1}
                  className={cn(
                    'text-[15px] font-bold',
                    selected
                      ? 'text-background dark:text-background'
                      : 'text-muted-foreground dark:text-muted-foreground',
                  )}>
                  {t.label}
                </Text>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </ScrollView>
    </Tabs>
  );
}
