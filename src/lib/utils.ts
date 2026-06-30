import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Title-case helper for names/labels. */
export function titleCase(s: string) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));
}
