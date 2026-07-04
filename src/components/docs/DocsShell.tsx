"use client";

import { MarkdownRenderer } from "@/components/mdx/MarkdownRenderer";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  getDocMeta,
  getFirstDocPath,
  getLanguageConfig,
  getPreviousNext,
  languages
} from "@/generated/content-index.generated";
import type { DocContent } from "@/generated/content.generated";
import { searchIndex } from "@/generated/search-index.generated";
import { searchDocuments, type SearchResult } from "@/lib/search";
import styles from "@/components/docs/DocsShell.module.css";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronRight,
  FileText,
  LogOut,
  Menu,
  Search,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function LanguageSelect({ language }: { language: string }) {
  const router = useRouter();

  return (
    <label className={styles.languageSelect}>
      <span>Language</span>
      <select
        value={language}
        onChange={(event) => {
          const nextLanguage = getLanguageConfig(event.target.value);

          if (nextLanguage) {
            router.push(`/docs/${nextLanguage.slug}`);
          }
        }}
      >
        {languages.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.title} ({item.nativeName})
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<SearchResult[]>(() => {
    return searchDocuments(searchIndex, query, { limit: 8 });
  }, [query]);

  const showResults = isFocused && query.trim().length >= 2;
  const trimmedQuery = query.trim();

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
    <div className={`${styles.searchShell} ${isFocused ? styles.searchShellActive : ""}`}>
      <label className={styles.searchBox} title="Press / to search">
        <span className={styles.searchIcon}>
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
            className={styles.searchClear}
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
          <span className={styles.searchShortcut}>/</span>
        )}
      </label>

      {showResults ? (
        <div className={styles.searchResults}>
          <div className={styles.searchMeta}>
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
                className={styles.searchResult}
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
            <div className={styles.searchEmpty}>No lessons found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({
  language,
  slug,
  onNavigate
}: {
  language: string;
  slug?: string;
  onNavigate?: () => void;
}) {
  const config = getLanguageConfig(language);

  if (!config) {
    return null;
  }

  return (
    <nav className={styles.sidebarNav} aria-label={`${config.title} pages`}>
      <div className={styles.sidebarHeading}>
        <BookOpen size={18} aria-hidden />
        <span>{config.nativeName}</span>
      </div>
      {config.pages.map((page, index) => {
        const isActive = page.slug === slug;

        return (
          <Link
            key={page.slug}
            className={`${styles.sidebarLink} ${isActive ? styles.activeLink : ""}`}
            href={`/docs/${language}/${page.slug}`}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.sidebarIndex}>{index + 1}.</span>
            <span className={styles.sidebarTitle}>{page.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DocsTopbar({
  language,
  onOpenNavigation
}: {
  language: string;
  onOpenNavigation: () => void;
}) {
  const { logout } = useAuth();

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <button
          aria-label="Open navigation"
          className={styles.iconButton}
          type="button"
          onClick={onOpenNavigation}
        >
          <Menu size={20} aria-hidden />
        </button>
        <Link href="/" className={styles.logoLink}>
          <span>Lexora</span>
        </Link>
      </div>
      <div className={styles.topbarActions}>
        <SearchBox />
        <LanguageSelect language={language} />
        <ThemeToggle />
        <button
          aria-label="Sign out"
          className={styles.iconButton}
          type="button"
          title="Sign out"
          onClick={() => logout()}
        >
          <LogOut size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}

function MobileDrawer({
  drawerOpen,
  language,
  slug,
  onClose
}: {
  drawerOpen: boolean;
  language: string;
  slug?: string;
  onClose: () => void;
}) {
  if (!drawerOpen) {
    return null;
  }

  return (
    <div className={styles.drawerBackdrop}>
      <aside className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <strong>Lessons</strong>
          <button
            aria-label="Close navigation"
            className={styles.iconButton}
            type="button"
            onClick={onClose}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <Sidebar language={language} slug={slug} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function TableOfContents({ toc }: { toc: DocContent["toc"] }) {
  if (!toc.length) {
    return null;
  }

  return (
    <aside className={styles.toc} aria-label="Table of contents">
      <strong>On this page</strong>
      {toc.map((item) => (
        <a
          key={`${item.id}-${item.text}`}
          className={item.depth === 3 ? styles.tocNested : ""}
          href={`#${item.id}`}
        >
          {item.text}
        </a>
      ))}
    </aside>
  );
}

function PreviousNext({ language, slug }: { language: string; slug: string }) {
  const { previous, next } = getPreviousNext(language, slug);

  return (
    <div className={styles.previousNext}>
      {previous ? (
        <Link href={`/docs/${language}/${previous.slug}`}>
          <span>Previous</span>
          {previous.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/docs/${language}/${next.slug}`}>
          <span>Next</span>
          {next.title}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

function GoToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <button
      aria-label="Go to top"
      className={`${styles.goTopButton} ${visible ? styles.goTopButtonVisible : ""}`}
      type="button"
      title="Go to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp size={18} aria-hidden />
    </button>
  );
}

function DocContentArea({ language, slug }: { language: string; slug: string }) {
  const [doc, setDoc] = useState<DocContent | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDoc(null);
      setMissing(false);

      const contentModule = await import("@/generated/content.generated");
      const nextDoc = contentModule.getGeneratedDoc(language, slug);

      if (!cancelled) {
        setDoc(nextDoc ?? null);
        setMissing(!nextDoc);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [language, slug]);

  if (missing) {
    return <div className={styles.docStatus}>This page is not available.</div>;
  }

  if (!doc) {
    return <div className={styles.docStatus}>Loading lesson...</div>;
  }

  return (
    <div className={styles.contentGrid}>
      <article className={styles.article}>
        <MarkdownRenderer source={doc.body} />
        <PreviousNext language={language} slug={slug} />
        <GoToTopButton />
      </article>
      <TableOfContents toc={doc.toc} />
    </div>
  );
}

export function DocsShell({ language, slug }: { language: string; slug: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const config = getLanguageConfig(language);
  const page = getDocMeta(language, slug);
  const firstPath = useMemo(() => getFirstDocPath(), []);

  if (!config || !page) {
    return (
      <div className={styles.docStatus}>
        Page not found. <Link href={firstPath}>Go to the first lesson.</Link>
      </div>
    );
  }

  return (
    <div className={styles.docs}>
      <DocsTopbar language={language} onOpenNavigation={() => setDrawerOpen(true)} />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Sidebar language={language} slug={slug} />
        </aside>

        <main className={styles.main}>
          <div className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight size={15} aria-hidden />
            <span>{config.title}</span>
            <ChevronRight size={15} aria-hidden />
            <span>{page.title}</span>
          </div>
          <DocContentArea language={language} slug={slug} />
        </main>
      </div>

      <MobileDrawer
        drawerOpen={drawerOpen}
        language={language}
        slug={slug}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

export function DocsLanguageOverview({ language }: { language: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const config = getLanguageConfig(language);

  if (!config) {
    return (
      <div className={styles.docStatus}>
        Page not found. <Link href={getFirstDocPath()}>Go to the first lesson.</Link>
      </div>
    );
  }

  return (
    <div className={styles.docs}>
      <DocsTopbar language={language} onOpenNavigation={() => setDrawerOpen(true)} />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Sidebar language={language} />
        </aside>

        <main className={styles.main}>
          <div className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight size={15} aria-hidden />
            <span>{config.title}</span>
          </div>

          <section className={styles.overview}>
            <div className={styles.overviewHeader}>
              <span className={styles.overviewPill}>{config.nativeName}</span>
              <h1>{config.title} Lessons</h1>
              <p>{config.description}</p>
            </div>

            <div className={styles.lessonGrid}>
              {config.pages.map((page) => (
                <Link
                  key={page.slug}
                  className={styles.lessonCard}
                  href={`/docs/${language}/${page.slug}`}
                >
                  <span className={styles.lessonIcon}>
                    <FileText size={20} aria-hidden />
                  </span>
                  <span className={styles.lessonContent}>
                    <strong>{page.title}</strong>
                    <small>{page.description}</small>
                  </span>
                  <ArrowRight className={styles.lessonArrow} size={18} aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>

      <MobileDrawer drawerOpen={drawerOpen} language={language} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
