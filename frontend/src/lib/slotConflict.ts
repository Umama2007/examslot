/**
 * Shared slot conflict / 4-6 status utilities.
 * Used by both the frontend design page and Vitest unit tests.
 *
 * Asia/Karachi wall-clock times: slots are stored as HH:MM strings.
 * The 60-minute default matches the backend COALESCE(end_time, start_time + interval '60 minutes').
 */

export const DEFAULT_DURATION_MINUTES = 60;

export interface SlotInterval {
  id: string;
  courseId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime?: string | null;  // HH:MM or null → default +60 min
}

/** Convert HH:MM to minutes-since-midnight */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Effective end time in minutes for a slot */
export function effectiveEndMinutes(slot: SlotInterval): number {
  if (slot.endTime) return toMinutes(slot.endTime);
  return toMinutes(slot.startTime) + DEFAULT_DURATION_MINUTES;
}

/**
 * Returns true if two slots for the SAME student overlap.
 * Uses half-open [start, end) intervals — adjacent slots are allowed.
 */
export function slotsOverlap(a: SlotInterval, b: SlotInterval): boolean {
  if (a.date !== b.date) return false;

  const aStart = toMinutes(a.startTime);
  const aEnd   = effectiveEndMinutes(a);
  const bStart = toMinutes(b.startTime);
  const bEnd   = effectiveEndMinutes(b);

  // [aStart, aEnd) and [bStart, bEnd) overlap iff aStart < bEnd && bStart < aEnd
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Given a list of selected slots, return pairs that conflict.
 */
export function findConflicts(slots: SlotInterval[]): [SlotInterval, SlotInterval][] {
  const conflicts: [SlotInterval, SlotInterval][] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (slotsOverlap(slots[i], slots[j])) {
        conflicts.push([slots[i], slots[j]]);
      }
    }
  }
  return conflicts;
}

export type CourseCountStatus = 'too_few' | 'ok' | 'too_many';

/**
 * 4-to-6 rule status helper.
 */
export function courseCountStatus(count: number): CourseCountStatus {
  if (count < 4) return 'too_few';
  if (count > 6) return 'too_many';
  return 'ok';
}
