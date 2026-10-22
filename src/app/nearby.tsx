import { MosqueSheet } from '@/components/platform/mosque-sheet';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { fetchTimetable } from '@/features/masjidbox/api';
import { useMosques } from '@/features/mosques/store';
import { distanceMetres } from '@/features/nearby/match';
import type { NearbyMosque } from '@/features/nearby/overpass';
import { matchQuery, nearbyQuery, usePosition, type Point } from '@/features/nearby/queries';
import { useScheme } from '@/features/settings/store';
import { MATERIAL_SEED } from '@/lib/theme';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { skipToken, useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPinIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAP_STYLE = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
};
const ME = '#5B8DEF';

/** Mosques around the phone from OpenStreetMap: map on top, nearest first below, tap one to add it. */
export default function Nearby() {
  const scheme = useScheme();
  const position = usePosition();
  const insets = useSafeAreaInsets();
  const nearby = useQuery(
    position.status === 'ready'
      ? nearbyQuery(position.area)
      : { queryKey: ['nearby', 'none'], queryFn: skipToken },
  );
  const [selected, setSelected] = useState<NearbyMosque>();

  const at = position.status === 'ready' ? position.at : undefined;
  const rows = useMemo(
    () =>
      at
        ? (nearby.data ?? [])
            .map((m) => ({ ...m, metres: distanceMetres(at, m) }))
            .sort((a, b) => a.metres - b.metres)
        : [],
    [nearby.data, at],
  );

  return (
    <View className="bg-background flex-1">
      <View className="bg-muted flex-1">
        {at && (
          <MosqueMap
            at={at}
            mosques={rows}
            selected={selected?.id}
            scheme={scheme}
            onSelect={(id) => setSelected(rows.find((m) => m.id === id))}
          />
        )}
      </View>
      <View className="bg-background -mt-6 flex-1 rounded-t-3xl pt-5">
        {rows.length > 0 ? (
          <FlatList
            data={rows}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListHeaderComponent={
              <Text className="pb-2 text-center text-base font-medium">Mosques nearby · {rows.length}</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelected(item)}
                android_ripple={{}}
                className="min-h-16 flex-row items-center gap-4 px-5 py-3">
                <View className="bg-action/15 size-10 items-center justify-center rounded-full">
                  <Icon as={MapPinIcon} className="text-action size-5" />
                </View>
                <View className="flex-1">
                  <Text numberOfLines={2} className="text-base">
                    {item.name ?? 'Mosque'}
                  </Text>
                  {!!(item.street || item.postcode) && (
                    <Text numberOfLines={1} className="text-muted-foreground text-sm">
                      {[item.street, item.postcode].filter(Boolean).join(', ')}
                    </Text>
                  )}
                </View>
                <Text className="text-base tabular-nums">{distance(item.metres)}</Text>
              </Pressable>
            )}
          />
        ) : (
          <Text className="text-muted-foreground px-8 pt-6 text-center text-base">
            {status(position.status, nearby)}
          </Text>
        )}
      </View>
      {selected && <Selected mosque={selected} scheme={scheme} onClose={() => setSelected(undefined)} />}
    </View>
  );
}

function MosqueMap({
  at,
  mosques,
  selected,
  scheme,
  onSelect,
}: {
  at: Point;
  mosques: NearbyMosque[];
  selected?: string;
  scheme: 'dark' | 'light';
  onSelect: (id: string) => void;
}) {
  const pins = useMemo(
    () =>
      ({
        type: 'FeatureCollection',
        features: mosques.map((m) => ({
          type: 'Feature',
          properties: { id: m.id },
          geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        })),
      }) satisfies GeoJSON.FeatureCollection,
    [mosques],
  );
  const pin = { 'circle-color': MATERIAL_SEED, 'circle-stroke-color': '#FFFFFF' } as const;
  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={MAP_STYLE[scheme]}
      logo={false}
      compass={false}
      // The list panel overlaps the map's bottom edge, so the credit sits at the top.
      attributionPosition={{ top: 8, right: 8 }}>
      <Camera initialViewState={{ center: [at.lng, at.lat], zoom: 13, padding: { bottom: 24 } }} />
      <GeoJSONSource
        id="mosques"
        data={pins}
        onPress={(e) => {
          const id = e.nativeEvent.features[0]?.properties?.id;
          if (typeof id === 'string') onSelect(id);
        }}>
        <Layer
          id="mosque-pins"
          type="circle"
          paint={{ ...pin, 'circle-radius': 7, 'circle-stroke-width': 2 }}
        />
        <Layer
          id="mosque-selected"
          type="circle"
          filter={['==', ['get', 'id'], selected ?? '']}
          paint={{ ...pin, 'circle-radius': 11, 'circle-stroke-width': 3 }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="me" data={{ type: 'Point', coordinates: [at.lng, at.lat] }}>
        <Layer
          id="me-dot"
          type="circle"
          paint={{
            'circle-color': ME,
            'circle-radius': 6,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}

/** The tapped mosque: its Masjid Box match and the one thing to do next. */
function Selected({
  mosque,
  scheme,
  onClose,
}: {
  mosque: NearbyMosque;
  scheme: 'dark' | 'light';
  onClose: () => void;
}) {
  const { mosques, add } = useMosques();
  const match = useQuery(matchQuery(mosque));
  const adding = useMutation({
    mutationFn: async (slug: string) => {
      await fetchTimetable({ slug }, new Date(), 1);
      return slug;
    },
    onSuccess: (slug) => {
      add({ id: slug, name: match.data?.name ?? mosque.name ?? 'Mosque', source: { slug } });
      onClose();
      router.dismissTo('/');
    },
  });
  const pasteLink = { label: 'Add with their website link', onPress: () => router.back() };
  const sheet = (detail: string, action?: { label: string; onPress: () => void; disabled?: boolean }) => (
    <MosqueSheet
      open
      name={mosque.name ?? 'Mosque'}
      detail={detail}
      action={action}
      onClose={onClose}
      scheme={scheme}
    />
  );

  if (match.isPending) return sheet('Looking for its timetable on Masjid Box…');
  if (match.isError)
    return sheet("Couldn't reach Masjid Box.", { label: 'Try again', onPress: () => match.refetch() });
  const found = match.data;
  if (!found)
    return sheet(
      'No timetable on Masjid Box. If their website shows prayer times, add it with that link.',
      pasteLink,
    );
  if (!found.open)
    return sheet("Its Masjid Box timetable isn't public. Try adding it with their website link.", pasteLink);
  if (mosques.some((m) => m.id === found.slug))
    return sheet(`${found.name}, ${found.address}`, { label: 'Added', onPress: onClose, disabled: true });
  if (adding.isError)
    return sheet("Couldn't load its timetable. Try again.", {
      label: 'Try again',
      onPress: () => adding.mutate(found.slug),
    });
  return sheet(`${found.name}, ${found.address}`, {
    label: adding.isPending ? 'Adding…' : 'Add mosque',
    onPress: () => adding.mutate(found.slug),
    disabled: adding.isPending,
  });
}

function status(position: string, nearby: { isFetching: boolean; isError: boolean; isSuccess: boolean }) {
  if (position === 'locating') return 'Finding where you are…';
  if (position === 'denied')
    return 'Location is off for this app. Allow it in Settings, or search by name instead.';
  if (position === 'failed') return "Couldn't get your location. Search by name instead.";
  if (nearby.isFetching)
    return 'Looking for mosques near you. The first search in an area can take up to 30 seconds.';
  if (nearby.isError)
    return "Couldn't load the map's mosques. Check your connection, or search by name instead.";
  return 'No mosques within 3 km on the map. Search by name instead.';
}

function distance(metres: number) {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
