/** Comparaison champ par champ de deux versions d'une entité (conflits de sync). */

export type DiffRow = {
  field: string;
  source: unknown;
  target: unknown;
  resolved: unknown;
  changed: boolean;
  /** Quelle version l'emporte dans la résolution choisie. */
  winner: "source" | "target" | "equal";
};

const norm = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export const formatValue = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export const computeDiff = (source: any, target: any, resolved: any): DiffRow[] => {
  const keys = Array.from(new Set([...Object.keys(source || {}), ...Object.keys(target || {})])).sort();
  return keys.map((field) => {
    const s = source?.[field];
    const t = target?.[field];
    const r = resolved?.[field];
    const changed = norm(s) !== norm(t);
    const winner: DiffRow["winner"] = !changed ? "equal" : norm(r) === norm(s) ? "source" : "target";
    return { field, source: s, target: t, resolved: r, changed, winner };
  });
};

export const diffSummary = (rows: DiffRow[]) => ({
  total: rows.length,
  changed: rows.filter((r) => r.changed).length,
  fromSource: rows.filter((r) => r.changed && r.winner === "source").length,
  fromTarget: rows.filter((r) => r.changed && r.winner === "target").length,
});
