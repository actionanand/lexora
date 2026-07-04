import type { SearchIndexItem } from "@/generated/search-index.generated";

export type SearchResult = SearchIndexItem & {
  score: number;
  snippet: string;
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string) {
  return normalizeSearchText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function makeSnippet(text: string, query: string) {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index < 0) {
    return text.slice(0, 120);
  }

  const start = Math.max(0, index - 44);
  const end = Math.min(text.length, index + query.length + 76);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function fieldScore(value: string, tokens: readonly string[], weight: number) {
  const normalized = normalizeSearchText(value);

  return tokens.reduce((score, token) => {
    if (normalized === token) {
      return score + weight * 3;
    }

    if (normalized.startsWith(token)) {
      return score + weight * 2;
    }

    return normalized.includes(token) ? score + weight : score;
  }, 0);
}

export function searchDocuments(
  index: readonly SearchIndexItem[],
  query: string,
  options: { limit?: number; language?: string } = {}
) {
  const tokens = tokenize(query);

  if (!tokens.length) {
    return [];
  }

  return index
    .filter((item) => !options.language || item.language === options.language)
    .map((item) => {
      const tokenMatches = tokens.filter((token) => item.searchText.includes(token));

      if (!tokenMatches.length) {
        return null;
      }

      const allTokensMatched = tokenMatches.length === tokens.length;
      const score =
        fieldScore(item.title, tokens, 12) +
        fieldScore(item.languageTitle, tokens, 8) +
        fieldScore(item.languageNativeName, tokens, 8) +
        fieldScore(item.headings.join(" "), tokens, 6) +
        fieldScore(item.description, tokens, 4) +
        fieldScore(item.content, tokens, 1) +
        (allTokensMatched ? 10 : 0);

      return {
        ...item,
        score,
        snippet: makeSnippet(item.content || item.description, query)
      };
    })
    .filter((item): item is SearchResult => Boolean(item))
    .sort((a, b) => b.score - a.score || a.languageTitle.localeCompare(b.languageTitle))
    .slice(0, options.limit ?? 8);
}
