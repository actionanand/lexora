"use client";

import { searchIndex } from "@/generated/search-index.generated";
import { searchDocuments, type SearchResult } from "@/lib/search";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/components/search/SiteSearch.module.css";

export function SiteSearch({
  compact = false,
  hero = false
}: {
  compact?: boolean;
  hero?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo<SearchResult[]>(() => {
    return searchDocuments(searchIndex, query, { limit: 8 });
  }, [query]);

  const trimmedQuery = query.trim();
  const showResults = isFocused && trimmedQuery.length >= 2;

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setQuery("");
        setIsFocused(false);
        inputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  function navigateToResult(result: SearchResult) {
    setQuery("");
    setIsFocused(false);
    router.push(result.path);
  }

  return (
    <div
      className={`${styles.shell} ${compact ? styles.compact : ""} ${hero ? styles.hero : ""} ${
        isFocused ? styles.active : ""
      }`}
    >
      <label className={styles.box} title="Press / to search">
        <span className={styles.icon}>
          <Search size={16} aria-hidden />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search lessons..."
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              navigateToResult(results[0]);
            }
          }}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className={styles.clear}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          <span className={styles.shortcut}>/</span>
        )}
      </label>

      {showResults ? (
        <div className={styles.results}>
          <div className={styles.meta}>
            <span>
              {results.length
                ? `${results.length} result${results.length === 1 ? "" : "s"}`
                : "No matches"}
            </span>
            <span> for </span>
            <strong>{trimmedQuery}</strong>
          </div>
          {results.length ? (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                className={styles.result}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigateToResult(result)}
              >
                <span>{result.title}</span>
                <small>
                  {result.languageTitle} / {result.snippet}
                </small>
              </button>
            ))
          ) : (
            <div className={styles.empty}>No lessons found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
