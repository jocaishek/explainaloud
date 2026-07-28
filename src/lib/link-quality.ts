const FOREIGN_TITLE_WORDS = new Set([
  "das",
  "de",
  "del",
  "der",
  "des",
  "die",
  "ein",
  "el",
  "en",
  "est",
  "et",
  "la",
  "las",
  "le",
  "les",
  "los",
  "und",
  "une",
  "una",
  "uno",
]);

const BLOCKED_RESOURCE_HOSTS = new Set([
  "bing.com",
  "dokumen.pub",
  "duckduckgo.com",
  "facebook.com",
  "google.com",
  "instagram.com",
  "m.youtube.com",
  "reddit.com",
  "studocu.com",
  "study.com",
  "tiktok.com",
  "x.com",
  "youtube.com",
]);

function normalizedHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * Search is explicitly requested in English, then this rejects results whose
 * visible metadata gives us evidence that they are not English. It catches
 * non-Latin titles deterministically and common Latin-script foreign titles.
 */
export function looksLikeEnglishText(value: string) {
  const letters = [...value].filter((character) => /\p{L}/u.test(character));
  if (letters.length === 0) return false;
  const latinLetters = letters.filter((character) =>
    /\p{Script=Latin}/u.test(character),
  );
  if (latinLetters.length / letters.length < 0.95) return false;

  const words = value
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const foreignSignals = words.filter((word) =>
    FOREIGN_TITLE_WORDS.has(word),
  ).length;
  return foreignSignals < 2;
}

export function directLearningWebsite(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const host = normalizedHost(url.hostname);
    if (
      BLOCKED_RESOURCE_HOSTS.has(host) ||
      [...BLOCKED_RESOURCE_HOSTS].some((blocked) =>
        host.endsWith(`.${blocked}`),
      )
    ) {
      return null;
    }

    const path = url.pathname.toLowerCase();
    if (
      path === "/" ||
      path.includes("/search") ||
      path.includes("/results") ||
      path.includes("/video/") ||
      path.includes("/videos/") ||
      url.searchParams.has("q") ||
      url.searchParams.has("query") ||
      url.searchParams.has("search_query")
    ) {
      return null;
    }

    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref" || key === "source") {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}
