import { prisma } from "@/lib/prisma";

const SETTING_ID = 1;

export interface CutoffConfig {
  enabled: boolean;
  time: string; // "HH:MM" (AEST)
  minutes: number; // minutes from midnight AEST
}

/** "19:30" -> 1170. Falls back to 19:00 (1140) if malformed. */
function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return 19 * 60;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
}

/** Pretty 12-hour label, e.g. "19:00" -> "7:00 PM". */
export function formatCutoff12h(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return time;
  const h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${min} ${ampm}`;
}

/** Load the settings row, creating the singleton with defaults if missing. */
export async function getAppSetting() {
  const existing = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  if (existing) return existing;
  return prisma.appSetting.create({ data: { id: SETTING_ID } });
}

/** Normalised cut-off config for the locking logic. */
export async function getCutoff(): Promise<CutoffConfig> {
  const s = await getAppSetting();
  return {
    enabled: s.predictionCutoffEnabled,
    time: s.predictionCutoffTime,
    minutes: timeToMinutes(s.predictionCutoffTime),
  };
}

export async function updateCutoff(enabled: boolean, time: string) {
  const safeTime = /^(\d{1,2}):(\d{2})$/.test(time.trim()) ? time.trim() : "19:00";
  return prisma.appSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID, predictionCutoffEnabled: enabled, predictionCutoffTime: safeTime },
    update: { predictionCutoffEnabled: enabled, predictionCutoffTime: safeTime },
  });
}
