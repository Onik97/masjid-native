/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { DaySchema } from '../src/features/masjidbox/api';
import {
  clock,
  countdown,
  focus,
  formatCountdown,
  nextMoment,
  nextSlot,
  slots,
  until,
} from '../src/features/prayers/times';
import { reminderPlan } from '../src/features/reminders/plan';
import fixture from './suleymaniye-2026-10-16.json';

// Parsing through the real schema also proves it still accepts what Masjid Box sends.
const days = DaySchema.array().parse(fixture);
const [friday, saturday] = days;

test('opens on the soonest iqamah ahead, then tomorrow Fajr once Isha has started', () => {
  expect(focus([days], new Date('2026-10-16T14:00:00+01:00'))).toEqual({ date: '2026-10-16', prayer: 'asr' });
  expect(focus([days], new Date('2026-10-16T20:15:00+01:00'))).toEqual({
    date: '2026-10-17',
    prayer: 'fajr',
  });
  // 23:30 UTC on the 16th is already the 17th in London (BST): its Fajr is still ahead.
  expect(focus([days], new Date('2026-10-16T23:30:00Z'))).toEqual({ date: '2026-10-17', prayer: 'fajr' });
});

test('Friday swaps dhuhr for Jumuah, other days keep dhuhr', () => {
  expect(slots(friday)[1]).toMatchObject({
    label: 'Jumuah',
    athan: '2026-10-16T13:15:00+01:00',
    iqamah: '2026-10-16T13:30:00+01:00',
  });
  expect(slots(saturday)[1].label).toBe('Dhuhr');
});

test('next slot is the first iqamah still ahead, none after isha starts', () => {
  expect(nextSlot(friday, new Date('2026-10-16T13:29:00+01:00'))?.label).toBe('Jumuah');
  expect(nextSlot(friday, new Date('2026-10-16T13:30:00+01:00'))?.label).toBe('Asr');
  expect(nextSlot(friday, new Date('2026-10-16T20:15:00+01:00'))).toBeUndefined();
});

test('countdown rounds up to the minute', () => {
  const at = '2026-10-16T13:30:00+01:00';
  expect(until(at, new Date('2026-10-16T12:24:30+01:00'))).toBe('in 1h 06m');
  expect(until(at, new Date('2026-10-16T13:22:59+01:00'))).toBe('in 8m');
  expect(until(at, new Date('2026-10-16T13:30:00+01:00'))).toBe('now');
});

test('reminders fire before each chosen iqamah, skipping ones already past', () => {
  const plan = reminderPlan(
    'Suleymaniye',
    days,
    ['dhuhr', 'isha'],
    15,
    new Date('2026-10-16T14:00:00+01:00'),
  );
  expect(plan.map((r) => [new Date(r.at).toISOString(), r.title])).toEqual([
    ['2026-10-16T19:00:00.000Z', 'Isha iqamah 8:15 pm · Suleymaniye'],
    ['2026-10-17T12:15:00.000Z', 'Dhuhr iqamah 1:30 pm · Suleymaniye'],
    [expect.any(String), expect.stringContaining('Isha')],
  ]);
});

test('reminders cover today and tomorrow only, so a changed timetable is never more than a day stale', () => {
  // The fixture holds the 16th and 17th; planned on the 15th, the 16th is tomorrow and the 17th too far.
  const plan = reminderPlan('Suleymaniye', days, ['isha'], 15, new Date('2026-10-15T12:00:00+01:00'));
  expect(plan.map((r) => new Date(r.at).toISOString())).toEqual(['2026-10-16T19:00:00.000Z']);
});

test('clock prints 12-hour times, with 12 (not 0) just past midnight and noon', () => {
  expect(clock('2026-10-16T00:05:00+01:00')).toBe('12:05 am');
  expect(clock('2026-10-16T12:30:00+01:00')).toBe('12:30 pm');
  expect(clock('2026-10-16T06:15:00+01:00')).toBe('6:15 am');
});

test('countdown aims at the athan while it is ahead and shown, then the iqamah', () => {
  const isha = slots(friday)[4]; // athan 20:00, iqamah 20:15
  const before = new Date('2026-10-16T19:25:17+01:00');
  expect(nextMoment(isha, before, true)).toEqual({ kind: 'athan', at: isha.athan });
  expect(nextMoment(isha, before, false)).toEqual({ kind: 'iqamah', at: isha.iqamah });
  expect(nextMoment(isha, new Date('2026-10-16T20:05:00+01:00'), true)?.kind).toBe('iqamah');
  expect(nextMoment(isha, new Date('2026-10-16T20:15:00+01:00'), true)).toBeUndefined();
  expect(countdown(isha.iqamah, before)).toEqual({ hours: 0, minutes: 49, seconds: 43 });
  expect(formatCountdown(countdown(isha.iqamah, before))).toBe('49:43');
  expect(formatCountdown({ hours: 1, minutes: 5, seconds: 2 })).toBe('1:05:02');
  expect(countdown(isha.iqamah, new Date('2026-10-16T21:00:00+01:00'))).toEqual({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});

test('a reminder already counting down stays planned until its iqamah, so a reschedule can still end it', () => {
  const plan = reminderPlan('Suleymaniye', days, ['isha'], 15, new Date('2026-10-16T20:05:00+01:00'));
  expect(new Date(plan[0].iqamah).toISOString()).toBe('2026-10-16T19:15:00.000Z');
});
