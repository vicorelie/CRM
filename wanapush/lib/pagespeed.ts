// PageSpeed Insights API — récupère les vraies Core Web Vitals (données CrUX
// = champ réel, mesurées sur les utilisateurs Chrome) + scores Lighthouse (lab).
// Doc : https://developers.google.com/speed/docs/insights/v5/get-started

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PsiStrategy = "mobile" | "desktop";

export type CoreWebVitals = {
  /** Source des données : "field" (CrUX réel) ou "lab" (Lighthouse seul) */
  source: "field" | "lab" | "none";
  lcp: { value: number; unit: "ms"; rating: "good" | "needs-improvement" | "poor" | null } | null;
  inp: { value: number; unit: "ms"; rating: "good" | "needs-improvement" | "poor" | null } | null;
  cls: { value: number; unit: "score"; rating: "good" | "needs-improvement" | "poor" | null } | null;
  fcp: { value: number; unit: "ms"; rating: "good" | "needs-improvement" | "poor" | null } | null;
  ttfb: { value: number; unit: "ms"; rating: "good" | "needs-improvement" | "poor" | null } | null;
  /** Score Lighthouse global (0-100) — lab seulement */
  lighthouseScore: number | null;
  /** Indique si toutes les CWV passent au seuil 75e percentile (= "good" CrUX) */
  allGood: boolean | null;
};

export type PsiResult = {
  url: string;
  strategy: PsiStrategy;
  coreWebVitals: CoreWebVitals;
  /** Top 3 opportunités d'optimisation (Lighthouse audits avec savings > 100ms) */
  opportunities: { id: string; title: string; description: string; savingsMs: number }[];
  error?: string;
};

const RATING_LABEL: Record<string, "good" | "needs-improvement" | "poor"> = {
  FAST: "good",
  AVERAGE: "needs-improvement",
  SLOW: "poor",
};

function ratingFromValue(metric: "lcp" | "inp" | "cls" | "fcp" | "ttfb", value: number): "good" | "needs-improvement" | "poor" {
  // Seuils officiels Google (mai 2026)
  const thresholds: Record<string, [number, number]> = {
    lcp:  [2500, 4000],   // ms
    inp:  [200, 500],     // ms
    cls:  [0.1, 0.25],    // score
    fcp:  [1800, 3000],   // ms
    ttfb: [800, 1800],    // ms
  };
  const [good, poor] = thresholds[metric];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export async function runPageSpeed(url: string, strategy: PsiStrategy = "mobile"): Promise<PsiResult> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (process.env.GOOGLE_PSI_API_KEY) {
    params.set("key", process.env.GOOGLE_PSI_API_KEY);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { signal: ctrl.signal });
  } catch (err) {
    return {
      url,
      strategy,
      coreWebVitals: emptyCwv(),
      opportunities: [],
      error: err instanceof Error ? err.message : "PSI fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    return {
      url,
      strategy,
      coreWebVitals: emptyCwv(),
      opportunities: [],
      error: `PSI HTTP ${res.status}`,
    };
  }

  const data = await res.json();
  const cwv = parseCoreWebVitals(data);
  const opportunities = parseOpportunities(data);

  return { url, strategy, coreWebVitals: cwv, opportunities };
}

function emptyCwv(): CoreWebVitals {
  const out: CoreWebVitals = {
    source: "none",
    lcp: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
    lighthouseScore: null,
    allGood: null,
  };
  return out;
}

type LighthouseAudit = {
  numericValue?: number;
  displayValue?: string;
};
type PsiData = {
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number; category?: string }>;
    overall_category?: string;
  };
  lighthouseResult?: {
    audits?: Record<string, LighthouseAudit & { id?: string; title?: string; description?: string; details?: { overallSavingsMs?: number } }>;
    categories?: { performance?: { score?: number } };
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCoreWebVitals(data: PsiData): CoreWebVitals {
  const result = emptyCwv() as any;

  // 1. Données field (CrUX) — la source de vérité Google pour le ranking
  const fieldMetrics = data.loadingExperience?.metrics;
  if (fieldMetrics) {
    result.source = "field";
    const map: Record<string, "lcp" | "inp" | "cls" | "fcp" | "ttfb"> = {
      LARGEST_CONTENTFUL_PAINT_MS: "lcp",
      INTERACTION_TO_NEXT_PAINT: "inp",
      CUMULATIVE_LAYOUT_SHIFT_SCORE: "cls",
      FIRST_CONTENTFUL_PAINT_MS: "fcp",
      EXPERIENCE_TIME_TO_FIRST_BYTE: "ttfb",
    };
    for (const [psiKey, ourKey] of Object.entries(map)) {
      const m = fieldMetrics[psiKey];
      if (m && typeof m.percentile === "number") {
        const value = ourKey === "cls" ? m.percentile / 100 : m.percentile;
        result[ourKey] = {
          value,
          unit: (ourKey === "cls" ? "score" : "ms") as "score" | "ms",
          rating: m.category ? (RATING_LABEL[m.category] ?? null) : ratingFromValue(ourKey, value),
        } as CoreWebVitals[typeof ourKey];
      }
    }
    const ratings = [result.lcp?.rating, result.inp?.rating, result.cls?.rating];
    result.allGood = ratings.every((r) => r === "good");
  }

  // 2. Données lab (Lighthouse) — fallback ou complément
  const audits = data.lighthouseResult?.audits;
  if (audits) {
    if (result.source === "none") result.source = "lab";

    const labMap: Record<string, "lcp" | "fcp" | "cls" | "ttfb"> = {
      "largest-contentful-paint": "lcp",
      "first-contentful-paint": "fcp",
      "cumulative-layout-shift": "cls",
      "server-response-time": "ttfb",
    };
    for (const [auditId, ourKey] of Object.entries(labMap)) {
      if (result[ourKey]) continue; // ne remplace pas le field data
      const audit = audits[auditId];
      if (audit?.numericValue != null) {
        result[ourKey] = {
          value: audit.numericValue,
          unit: ourKey === "cls" ? "score" : "ms",
          rating: ratingFromValue(ourKey, audit.numericValue),
        };
      }
    }
  }

  // 3. Score Lighthouse global
  const score = data.lighthouseResult?.categories?.performance?.score;
  if (typeof score === "number") {
    result.lighthouseScore = Math.round(score * 100);
  }

  return result;
}

function parseOpportunities(data: PsiData): PsiResult["opportunities"] {
  const audits = data.lighthouseResult?.audits ?? {};
  const opps: PsiResult["opportunities"] = [];

  for (const [id, audit] of Object.entries(audits)) {
    const savings = audit.details?.overallSavingsMs;
    if (typeof savings === "number" && savings >= 100) {
      opps.push({
        id,
        title: audit.title ?? id,
        description: audit.description ?? "",
        savingsMs: Math.round(savings),
      });
    }
  }

  return opps.sort((a, b) => b.savingsMs - a.savingsMs).slice(0, 5);
}
