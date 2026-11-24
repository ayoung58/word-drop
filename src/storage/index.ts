// Persistent storage for best score, streak and settings.
// Everything goes through this module so the backend (localStorage, Capacitor
// Preferences, cloud) can be swapped without touching game logic.

export interface StoredData {
  bestScore: number;
  streak: number;
  /** ISO date string of the last completed game, e.g. '2026-11-23'. */
  lastPlayedDate: string;
}

const KEY = 'word-drop';
const DEFAULTS: StoredData = { bestScore: 0, streak: 0, lastPlayedDate: '' };

export function load(): StoredData {
  try {
    const raw = localStorage.getItem(KEY);
    // Spread over the defaults so a save from an older version still has every field.
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<StoredData>) } : { ...DEFAULTS };
  } catch {
    // Corrupted data or storage unavailable — start fresh.
    return { ...DEFAULTS };
  }
}

export function save(data: StoredData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
