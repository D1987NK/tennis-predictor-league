// Timezone helpers.
//
// Source times in the CSVs are given in BST (British Summer Time, UTC+1) during
// the grass season. The app surfaces AEST (Australian Eastern Standard Time,
// UTC+10) to users and stores a resolved UTC `startsAt` instant used to lock
// predictions.
//
// During Wimbledon (July) Australia observes standard time, so AEST = BST + 9h.

const BST_OFFSET_MIN = 60; // UTC+1
const AEST_OFFSET_MIN = 600; // UTC+10

/** Parse "HH:MM" -> minutes since midnight, or null. */
function parseHHMM(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtHHMM(totalMin: number): string {
  const mod = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(mod / 60);
  const m = mod % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convert a BST "HH:MM" to AEST "HH:MM" (+9h). */
export function bstToAest(timeBst: string | null | undefined): string | null {
  const min = parseHHMM(timeBst);
  if (min === null) return null;
  return fmtHHMM(min + (AEST_OFFSET_MIN - BST_OFFSET_MIN));
}

/**
 * Resolve a UTC instant for a match given its date (local date, no tz) and BST
 * start time. UTC = BST - 1h. If no time, defaults to 11:00 BST.
 */
export function resolveStartsAt(matchDate: Date, timeBst: string | null | undefined): Date {
  const min = parseHHMM(timeBst) ?? 11 * 60;
  const utcMin = min - BST_OFFSET_MIN;
  const d = new Date(
    Date.UTC(
      matchDate.getUTCFullYear(),
      matchDate.getUTCMonth(),
      matchDate.getUTCDate(),
      0,
      0,
      0,
    ),
  );
  d.setUTCMinutes(d.getUTCMinutes() + utcMin);
  return d;
}

/**
 * Parse a date string in either YYYY-MM-DD or DD/MM/YYYY into a UTC-midnight Date.
 * Returns null if unparseable.
 */
export function parseFlexibleDate(input: string): Date | null {
  const s = input.trim();
  let y: number, mo: number, d: number;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
  } else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    d = Number(m[1]);
    mo = Number(m[2]);
    y = Number(m[3]);
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Format a UTC-stored date as YYYY-MM-DD. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
