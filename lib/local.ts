// Per-device conveniences in localStorage (may be unavailable, so never throw).

export interface RecentGame {
  code: string;
  name: string;
  at: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const recentGames = () => read<RecentGame[]>("bt_recent", []);

export function rememberGame(code: string, name: string) {
  write("bt_recent", [{ code, name, at: Date.now() }, ...recentGames().filter((g) => g.code !== code)].slice(0, 10));
}
