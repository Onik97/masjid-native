/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { addressAgrees, extractPostcode, searchKeywords } from '../src/features/nearby/match';
import { parseOverpass } from '../src/features/nearby/overpass';
import fixtures from './nearby-fixtures.json';

// Real Overpass and Masjid Box responses captured around E2 8AX (Kingsland Road, Dalston), 2026-10-22.
const mosques = parseOverpass(fixtures.overpass);
const osm = (id: string) => {
  const found = mosques.find((m) => m.id === id);
  if (!found) throw new Error(`no fixture for ${id}`);
  return found;
};
const hoxton = osm('node/5931064082');
const suleymaniye = osm('way/305035308');
const shoreditchTrust = osm('way/224884567');
const madina = osm('way/58702154');
const { search, postcodes } = fixtures;

test('parses nodes and ways, keeps unnamed mosques, drops elements with no position', () => {
  expect(hoxton).toEqual({
    id: 'node/5931064082',
    name: 'Hoxton Islah',
    lat: 51.5294969,
    lng: -0.0836774,
    postcode: 'N1 6BT',
    street: 'Pitfield Street',
  });
  // A way has no lat/lon of its own, only a centre.
  expect(suleymaniye).toMatchObject({ id: 'way/305035308', lat: 51.5353015, lng: -0.0764441 });
  expect(suleymaniye.postcode).toBeUndefined();
  expect(mosques.find((m) => m.id === 'node/2404125477')).toMatchObject({
    name: undefined,
    street: 'Cable Street',
  });
  const positionless = { elements: [{ type: 'way', id: 1, tags: { name: 'Nowhere' } }] };
  expect(parseOverpass(positionless)).toEqual([]);
});

test('accepts the Masjid Box entry whose address agrees with the OSM mosque', () => {
  // Same mosque, different postcode (N1 6BT in OSM, N1 6BS on Masjid Box): the two are ~60 m apart.
  expect(addressAgrees(hoxton, search.hoxton[0], postcodes['N1 6BS'])).toBe(true);
  // OSM has no postcode or street for it; the Masjid Box postcode is a few metres away.
  expect(addressAgrees(suleymaniye, search.suleymaniye[0], postcodes['E2 8AX'])).toBe(true);
  // Masjid Box gives no postcode here, so the OSM street decides.
  expect(addressAgrees(shoreditchTrust, search.shoreditch[0])).toBe(true);
  // Equal postcodes need no lookup, whatever the case or spacing.
  expect(addressAgrees(hoxton, { address: 'Pitfield Street, n16bt' })).toBe(true);
});

test('rejects a same-name or nearby-name mosque somewhere else', () => {
  // Spec success criterion: OSM Madina Masjid (E5 9QD) is not the one on High Street North.
  expect(search.madina[2].name).toBe('Madina Masjid');
  expect(addressAgrees(madina, search.madina[2])).toBe(false);
  // Searching the Shoreditch trust's name returns a Hackney Road mosque.
  expect(addressAgrees(shoreditchTrust, search.shoreditchTrust[0])).toBe(false);
  // A postcode ~900 m from the mosque is not close enough.
  expect(addressAgrees(hoxton, search.suleymaniye[0], postcodes['E2 8AX'])).toBe(false);
  // A postcode that couldn't be located never matches.
  expect(addressAgrees(hoxton, search.hoxton[0], undefined)).toBe(false);
});

test('search keywords: the name, then the name without generic words, none when unnamed', () => {
  expect(searchKeywords('Shoreditch Masjid Trust')).toEqual(['Shoreditch Masjid Trust', 'Shoreditch']);
  expect(searchKeywords('Al-Nehar Mosque & Education Centre')).toEqual([
    'Al-Nehar Mosque & Education Centre',
    'Al-Nehar Education',
  ]);
  expect(searchKeywords('Hoxton Islah')).toEqual(['Hoxton Islah']);
  expect(searchKeywords('Masjid')).toEqual(['Masjid']);
  expect(searchKeywords(undefined)).toEqual([]);
});

test('finds a UK postcode in a Masjid Box address and ignores foreign ones', () => {
  expect(extractPostcode(search.suleymaniye[0].address)).toBe('E2 8AX');
  expect(extractPostcode(search.hoxton[0].address)).toBe('N1 6BS');
  expect(extractPostcode(search.hoxton[1].address)).toBeUndefined(); // Lochem, Netherlands
  expect(extractPostcode(search.madina[2].address)).toBeUndefined();
});
