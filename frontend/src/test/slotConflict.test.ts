import { describe, it, expect } from 'vitest';
import {
  slotsOverlap,
  findConflicts,
  courseCountStatus,
  toMinutes,
  effectiveEndMinutes,
  DEFAULT_DURATION_MINUTES,
  type SlotInterval,
} from '../lib/slotConflict';

describe('toMinutes', () => {
  it('converts HH:MM to minutes', () => {
    expect(toMinutes('09:00')).toBe(540);
    expect(toMinutes('13:30')).toBe(810);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('23:59')).toBe(1439);
  });
});

describe('effectiveEndMinutes', () => {
  it('uses explicit end time when provided', () => {
    const slot: SlotInterval = {
      id: '1', courseId: 'c1', date: '2026-11-01',
      startTime: '09:00', endTime: '10:30',
    };
    expect(effectiveEndMinutes(slot)).toBe(toMinutes('10:30'));
  });

  it(`defaults to start + ${DEFAULT_DURATION_MINUTES} minutes when end is null`, () => {
    const slot: SlotInterval = {
      id: '1', courseId: 'c1', date: '2026-11-01',
      startTime: '09:00', endTime: null,
    };
    expect(effectiveEndMinutes(slot)).toBe(toMinutes('09:00') + DEFAULT_DURATION_MINUTES);
  });
});

describe('slotsOverlap', () => {
  const makeSlot = (id: string, date: string, start: string, end?: string | null): SlotInterval => ({
    id, courseId: `course-${id}`, date, startTime: start, endTime: end ?? null,
  });

  it('returns false for slots on different dates', () => {
    const a = makeSlot('a', '2026-11-01', '09:00', '10:00');
    const b = makeSlot('b', '2026-11-02', '09:00', '10:00');
    expect(slotsOverlap(a, b)).toBe(false);
  });

  it('returns false for adjacent [) slots — 10:00-11:00 and 11:00-12:00', () => {
    const a = makeSlot('a', '2026-11-01', '10:00', '11:00');
    const b = makeSlot('b', '2026-11-01', '11:00', '12:00');
    expect(slotsOverlap(a, b)).toBe(false);
  });

  it('returns true for overlapping slots — 10:00-11:00 and 10:30-11:30', () => {
    const a = makeSlot('a', '2026-11-01', '10:00', '11:00');
    const b = makeSlot('b', '2026-11-01', '10:30', '11:30');
    expect(slotsOverlap(a, b)).toBe(true);
  });

  it('returns true for fully contained slots', () => {
    const a = makeSlot('a', '2026-11-01', '09:00', '12:00');
    const b = makeSlot('b', '2026-11-01', '10:00', '11:00');
    expect(slotsOverlap(a, b)).toBe(true);
  });

  it('null end time (default 60 min) conflicts with 10:30-11:30', () => {
    // start 10:00, end NULL → 10:00-11:00; overlaps with 10:30-11:30
    const a = makeSlot('a', '2026-11-01', '10:00', null);
    const b = makeSlot('b', '2026-11-01', '10:30', '11:30');
    expect(slotsOverlap(a, b)).toBe(true);
  });

  it('null end time does NOT conflict with 11:00-12:00', () => {
    // start 10:00, end NULL → 10:00-11:00; adjacent to 11:00-12:00
    const a = makeSlot('a', '2026-11-01', '10:00', null);
    const b = makeSlot('b', '2026-11-01', '11:00', '12:00');
    expect(slotsOverlap(a, b)).toBe(false);
  });

  it('same start and end — identical slots overlap', () => {
    const a = makeSlot('a', '2026-11-01', '10:00', '11:00');
    const b = makeSlot('b', '2026-11-01', '10:00', '11:00');
    expect(slotsOverlap(a, b)).toBe(true);
  });
});

describe('findConflicts', () => {
  it('returns empty array for non-conflicting slots', () => {
    const slots: SlotInterval[] = [
      { id: '1', courseId: 'c1', date: '2026-11-01', startTime: '09:00', endTime: '10:00' },
      { id: '2', courseId: 'c2', date: '2026-11-01', startTime: '10:00', endTime: '11:00' },
      { id: '3', courseId: 'c3', date: '2026-11-02', startTime: '09:00', endTime: '10:00' },
    ];
    expect(findConflicts(slots)).toHaveLength(0);
  });

  it('detects a single conflict', () => {
    const slots: SlotInterval[] = [
      { id: '1', courseId: 'c1', date: '2026-11-01', startTime: '09:00', endTime: '10:30' },
      { id: '2', courseId: 'c2', date: '2026-11-01', startTime: '10:00', endTime: '11:00' },
      { id: '3', courseId: 'c3', date: '2026-11-02', startTime: '09:00', endTime: '10:00' },
    ];
    const conflicts = findConflicts(slots);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0][0].id).toBe('1');
    expect(conflicts[0][1].id).toBe('2');
  });

  it('detects multiple conflicts', () => {
    const slots: SlotInterval[] = [
      { id: '1', courseId: 'c1', date: '2026-11-01', startTime: '09:00', endTime: '11:00' },
      { id: '2', courseId: 'c2', date: '2026-11-01', startTime: '09:30', endTime: '10:30' },
      { id: '3', courseId: 'c3', date: '2026-11-01', startTime: '10:00', endTime: '11:30' },
    ];
    // 1↔2, 1↔3, 2↔3 all overlap
    expect(findConflicts(slots).length).toBeGreaterThanOrEqual(2);
  });
});

describe('courseCountStatus', () => {
  it('returns too_few for count < 4', () => {
    expect(courseCountStatus(0)).toBe('too_few');
    expect(courseCountStatus(3)).toBe('too_few');
  });

  it('returns ok for counts 4–6', () => {
    expect(courseCountStatus(4)).toBe('ok');
    expect(courseCountStatus(5)).toBe('ok');
    expect(courseCountStatus(6)).toBe('ok');
  });

  it('returns too_many for count > 6', () => {
    expect(courseCountStatus(7)).toBe('too_many');
    expect(courseCountStatus(10)).toBe('too_many');
  });
});
