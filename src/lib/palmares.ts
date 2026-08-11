/**
 * Registro global de títulos (palmarés histórico).
 * Guarda cada título ganado en el juego para poder construir
 * la tabla de "Máximos Ganadores" por competición.
 */

export interface TitleRecord {
  compId: string;
  compName: string;
  type: "league" | "cup";
  div: number;
  season: number;
  teamId: number;
  teamName: string;
  color1?: string | undefined;
  color2?: string | undefined;
  isFlag?: boolean | undefined;
}

export interface WinnerRow {
  teamName: string;
  titles: number;
  color1?: string | undefined;
  color2?: string | undefined;
  isFlag?: boolean | undefined;
  seasons: number[];
}

export interface RegisterTitleInput {
  compId: string;
  compName: string;
  type: "league" | "cup";
  div: number;
  winner: {
    id?: number;
    name?: string;
    color1?: string;
    color2?: string;
    isFlag?: boolean;
  };
  season: number;
}

const STORAGE_KEY = "dice-football-hub-elite-v6_palmares";
const listeners = new Set<() => void>();

const isBrowser = () => typeof window !== "undefined";

export const getTitles = (): TitleRecord[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const save = (titles: TitleRecord[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  } catch {
    /* almacenamiento no disponible */
  }
  listeners.forEach((fn) => fn());
};

export const subscribeTitles = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const registerTitles = (entries: RegisterTitleInput[]) => {
  if (!entries.length) return;
  const titles = getTitles();
  const knownEditions = new Set(
    titles.map((title) => `${title.compId}:${title.div}:${title.season}`),
  );
  const additions: TitleRecord[] = [];

  entries.forEach(({ compId, compName, type, div, winner, season }) => {
    if (!winner?.name || !Number.isFinite(season)) return;
    const editionKey = `${compId}:${div}:${season}`;
    // Una competición y división solo pueden tener un campeón por temporada.
    // También protege frente a cierres repetidos por efectos de React.
    if (knownEditions.has(editionKey)) return;
    knownEditions.add(editionKey);
    additions.push({
      compId,
      compName,
      type,
      div,
      season,
      teamId: winner.id ?? 0,
      teamName: winner.name,
      color1: winner.color1,
      color2: winner.color2,
      isFlag: !!winner.isFlag,
    });
  });

  if (!additions.length) return;
  // El historial visual solo conserva 10 ediciones, pero el palmarés es
  // acumulativo: se escribe el lote completo sin recortar ningún título.
  save([...additions, ...titles]);
};

export const registerTitle = (entry: RegisterTitleInput) =>
  registerTitles([entry]);

/** Tabla de máximos ganadores de una competición (una estrella por título). */
export const getTopWinners = (compId: string, div = 1): WinnerRow[] => {
  const rows = new Map<string, WinnerRow>();
  getTitles()
    .filter((t) => t.compId === compId && (t.type === "cup" || t.div === div))
    .forEach((t) => {
      const row = rows.get(t.teamName) ?? {
        teamName: t.teamName,
        titles: 0,
        color1: t.color1,
        color2: t.color2,
        isFlag: t.isFlag,
        seasons: [] as number[],
      };
      row.titles += 1;
      row.seasons.push(t.season);
      rows.set(t.teamName, row);
    });
  return [...rows.values()].sort(
    (a, b) => b.titles - a.titles || a.teamName.localeCompare(b.teamName),
  );
};

export const clearTitles = () => save([]);
