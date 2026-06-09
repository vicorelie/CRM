// Single-flight (audit H7) : dédoublonne les opérations concurrentes identiques.
// Cas d'usage : refresh de token OAuth. Deux appels concurrents (cron + requête UI)
// déclenchaient deux refresh parallèles → le 2ᵉ token persisté peut invalider/écraser
// le 1er (le provider rote le refresh_token). On garantit UN SEUL refresh en vol
// par clé ; les autres appelants attendent le même résultat.
//
// In-memory (par process) — suffisant pour le déploiement single-node actuel. Pour
// du multi-instance, passer sur un lock distribué (advisory lock SQL / Redis).

const inflight = new Map<string, Promise<unknown>>();

export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
