import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  fetchTimetable,
  looksLikeLink,
  resolveLink,
  searchMosques,
  type Source,
} from '@/features/masjidbox/api';
import { useMosques } from '@/features/mosques/store';
import { useScheme } from '@/features/settings/store';
import { THEME } from '@/lib/theme';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { LinkIcon, SearchIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

type Pick = { link: string } | { slug: string; name: string };

/** Find a mosque by name through Masjid Box, or paste its website or masjidbox.com link. */
export default function Add() {
  const { mosques, add } = useMosques();
  const scheme = useScheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  // Search as the user types, but not on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(id);
  }, [text]);

  const link = looksLikeLink(text);
  const search = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchMosques(query),
    enabled: query.length >= 2 && !looksLikeLink(query),
    staleTime: 5 * 60_000,
  });

  const adding = useMutation({
    mutationFn: async (pick: Pick): Promise<{ source: Source; name: string }> => {
      if ('link' in pick) return resolveLink(pick.link, new Date());
      const source = { slug: pick.slug };
      await fetchTimetable(source, new Date(), 1);
      return { source, name: pick.name };
    },
    onSuccess: ({ source, name }) => {
      add({ id: 'key' in source ? source.key : source.slug, name, source });
      router.back();
    },
  });

  const added = new Set(mosques.map((m) => m.id));
  const results = link ? [] : (search.data ?? []);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: 'Mosque name, postcode or website',
            autoCapitalize: 'none',
            autoFocus: true,
            // The Android search field defaults to dark text, invisible on the black app bar.
            textColor: THEME[scheme].foreground,
            hintTextColor: THEME[scheme].mutedForeground,
            headerIconColor: THEME[scheme].foreground,
            onChangeText: (e) => {
              setText(e.nativeEvent.text);
              adding.reset();
            },
            onSearchButtonPress: (e) => {
              const value = e.nativeEvent.text.trim();
              if (looksLikeLink(value)) adding.mutate({ link: value });
            },
          },
        }}
      />
      <FlatList
        data={results}
        keyExtractor={(m) => m.slug}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <>
            {link && (
              <Row
                icon
                title={adding.isPending ? 'Finding the timetable…' : `Add from ${text.trim()}`}
                subtitle="Looks for Masjid Box on that page"
                onPress={() => adding.mutate({ link: text.trim() })}
              />
            )}
            {adding.error && (
              <Text className="text-destructive px-5 py-3 text-sm">{adding.error.message}</Text>
            )}
          </>
        }
        ListEmptyComponent={
          !link ? (
            <View className="items-center gap-3 px-8 pt-24">
              <Icon as={SearchIcon} className="text-muted-foreground size-12" />
              <Text className="text-muted-foreground text-center text-base">
                {search.isFetching
                  ? 'Searching…'
                  : query.length >= 2 && search.isSuccess
                    ? 'No mosques found. Try a postcode, or paste their website.'
                    : 'Search for a mosque, or paste its website'}
              </Text>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const already = added.has(item.slug);
          return (
            <Row
              title={item.name}
              subtitle={
                item.open
                  ? item.address
                  : "Timetable isn't public on Masjid Box. Try pasting their website link."
              }
              trailing={already ? 'Added' : undefined}
              disabled={already || !item.open || adding.isPending}
              onPress={() => adding.mutate({ slug: item.slug, name: item.name })}
            />
          );
        }}
      />
    </View>
  );
}

function Row({
  title,
  subtitle,
  trailing,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  subtitle: string;
  trailing?: string;
  icon?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{}}
      className="min-h-16 flex-row items-center gap-4 px-5 py-3">
      {icon && <Icon as={LinkIcon} className="text-muted-foreground size-5" />}
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className={disabled && !trailing ? 'text-muted-foreground text-base' : 'text-base'}>
          {title}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={2} className="text-muted-foreground text-sm">
            {subtitle}
          </Text>
        )}
      </View>
      {trailing && <Text className="text-muted-foreground text-sm">{trailing}</Text>}
    </Pressable>
  );
}
