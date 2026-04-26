const BANG_SOURCE_URL = "https://duckduckgo.com/bang.js";
const BANG_REFRESH_MS = 1000 * 60 * 60 * 6;

type BangRecord = {
  t: string;
  u: string;
};

type BangCache = {
  fetchedAtMs: number;
  byToken: Map<string, string>;
};

let cache: BangCache | null = null;
let refreshInFlight: Promise<BangCache | null> | null = null;

function toBangCache(records: BangRecord[]): BangCache {
  const byToken = new Map<string, string>();
  for (const record of records) {
    if (!record.t || !record.u) {
      continue;
    }
    byToken.set(record.t.toLowerCase(), record.u);
  }

  return {
    fetchedAtMs: Date.now(),
    byToken,
  };
}

async function fetchBangCache(): Promise<BangCache | null> {
  try {
    const response = await fetch(BANG_SOURCE_URL, {
      headers: {
        accept: "application/json,text/javascript,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return null;
    }

    const records = (await response.json()) as BangRecord[];
    return toBangCache(records);
  } catch {
    return null;
  }
}

export async function getBangTemplateByToken(token: string): Promise<string | null> {
  const now = Date.now();
  const lowerToken = token.toLowerCase();

  if (cache && now - cache.fetchedAtMs < BANG_REFRESH_MS) {
    return cache.byToken.get(lowerToken) ?? null;
  }

  if (!refreshInFlight) {
    refreshInFlight = fetchBangCache().finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshed = await refreshInFlight;
  if (refreshed) {
    cache = refreshed;
  }

  if (!cache) {
    return null;
  }

  return cache.byToken.get(lowerToken) ?? null;
}
