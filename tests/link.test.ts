/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { findMasjidBox, looksLikeLink } from '../src/features/masjidbox/api';

test('a widget embed wins over the prayer-times link next to it', () => {
  const html =
    '.mb-widget a[data-masjidbox-widget]{display:block}' +
    '<a data-masjidbox-widget="qr5YbXShClECg8qrrg9sa" data-masjidbox-ifr href="https://masjidbox.com/prayer-times/masjidsahabah">';
  expect(findMasjidBox(html)).toEqual({ key: 'qr5YbXShClECg8qrrg9sa' });
});

test('a page that only links to Masjid Box gives its slug, ignoring the widget loader', () => {
  const html =
    '<script src="https://masjidbox.com/widgets/loader.js"></script>' +
    '<a href="https://masjidbox.com/prayer-times/shahporan" target="_blank">';
  expect(findMasjidBox(html)).toEqual({ slug: 'shahporan' });
});

test('pasted Masjid Box URLs: any language path, the iframe URL, or nothing useful', () => {
  expect(findMasjidBox('https://masjidbox.com/horaires-de-priere/mosquee-de-lyon')).toEqual({
    slug: 'mosquee-de-lyon',
  });
  expect(findMasjidBox('https://masjidbox.com/w/PxlRvTyAKL9BxvCG_zoqR?i=0')).toEqual({
    key: 'PxlRvTyAKL9BxvCG_zoqR',
  });
  expect(findMasjidBox('https://example.com/about-us')).toBeUndefined();
});

test('a link is told apart from a mosque name typed into the same search box', () => {
  expect(looksLikeLink('shahporanmasjid.uk')).toBe(true);
  expect(looksLikeLink('https://masjidbox.com/prayer-times/shahporan')).toBe(true);
  expect(looksLikeLink('masjid sahabah')).toBe(false);
  expect(looksLikeLink('E2 8AX')).toBe(false);
});
