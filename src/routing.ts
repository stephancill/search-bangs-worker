const GOOGLE_SEARCH_URL = "https://www.google.com/search";
const GOOGLE_HOME_URL = "https://www.google.com/";

const LEADING_NAMED_BANG_PATTERN = /^!([a-z0-9-]+)(?:\s+(.*))?$/i;
const TRAILING_LUCKY_BANG_PATTERN = /^(.*\S)\s+!$/;

export type ParsedQuery =
  | { kind: "default"; terms: string; original: string }
  | { kind: "lucky"; terms: string; original: string }
  | { kind: "namedBang"; bang: string; terms: string; original: string };

export function parseQuery(rawQuery: string): ParsedQuery {
  const query = rawQuery.trim();

  if (query === "!") {
    return { kind: "lucky", terms: "", original: query };
  }

  const trailingLuckyMatch = query.match(TRAILING_LUCKY_BANG_PATTERN);
  if (trailingLuckyMatch) {
    return {
      kind: "lucky",
      terms: trailingLuckyMatch[1].trim(),
      original: query,
    };
  }

  if (query.startsWith("! ")) {
    return {
      kind: "lucky",
      terms: query.slice(2).trim(),
      original: query,
    };
  }

  const namedBangMatch = query.match(LEADING_NAMED_BANG_PATTERN);
  if (namedBangMatch) {
    return {
      kind: "namedBang",
      bang: namedBangMatch[1].toLowerCase(),
      terms: (namedBangMatch[2] ?? "").trim(),
      original: query,
    };
  }

  return { kind: "default", terms: query, original: query };
}

export function googleSearchUrl(terms: string): string {
  const url = new URL(GOOGLE_SEARCH_URL);
  url.searchParams.set("q", terms);
  return url.toString();
}

export function googleLuckyUrl(terms: string): string {
  if (terms.length === 0) {
    return GOOGLE_HOME_URL;
  }

  const url = new URL(GOOGLE_SEARCH_URL);
  url.searchParams.set("btnI", "I");
  url.searchParams.set("q", terms);
  return url.toString();
}

export function applyBangTemplate(template: string, terms: string): string {
  const encodedTerms = encodeURIComponent(terms);
  return template.split("{{{s}}}").join(encodedTerms);
}
