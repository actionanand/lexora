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
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ChevronRight,
  FileText,
  LogOut,
  Menu,
  Copy,
  PictureInPicture,
  PlayCircle,
  Search,
  Volume2,
  VolumeX,
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
        <Link href={`/docs/${language}/${previous.slug}`} aria-label={`Previous lesson: ${previous.title}`}>
          <span className={styles.previousNextIcon}>
            <ArrowLeft size={18} aria-hidden />
          </span>
          <strong>{previous.title}</strong>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/docs/${language}/${next.slug}`} aria-label={`Next lesson: ${next.title}`}>
          <strong>{next.title}</strong>
          <span className={styles.previousNextIcon}>
            <ArrowRight size={18} aria-hidden />
          </span>
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

type MediaEmbed = DocContent["mediaEmbeds"][number];

type YouTubePlayer = {
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
      };
    }
  ) => YouTubePlayer;
};

type YouTubeWindow = Window &
  typeof globalThis & {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
    __lexoraYouTubeApiPromise?: Promise<YouTubeApi>;
  };

type BaseResolvedMediaEmbed = {
  kind: "landscape" | "portrait";
  muted: boolean;
  supportsMuteToggle: boolean;
  title: string;
  url: string;
  watchUrl: string;
};

type YouTubeResolvedMediaEmbed = BaseResolvedMediaEmbed & {
  provider: "youtube";
  id: string;
  start: number;
  supportsMuteToggle: true;
};

type ResolvedMediaEmbed =
  | YouTubeResolvedMediaEmbed
  | (BaseResolvedMediaEmbed & {
      provider: "facebook";
      supportsMuteToggle: true;
    })
  | (BaseResolvedMediaEmbed & {
      provider: "instagram" | "tiktok";
      supportsMuteToggle: false;
    });

function tiktokVideoId(url?: string) {
  return url?.match(/\/video\/(\d+)/)?.[1] ?? "";
}

function getYouTubeApi() {
  const youtubeWindow = window as YouTubeWindow;

  if (youtubeWindow.YT?.Player) {
    return Promise.resolve(youtubeWindow.YT);
  }

  youtubeWindow.__lexoraYouTubeApiPromise ??= new Promise<YouTubeApi>((resolve) => {
    const previousReady = youtubeWindow.onYouTubeIframeAPIReady;

    youtubeWindow.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (youtubeWindow.YT?.Player) {
        resolve(youtubeWindow.YT);
      }
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.append(tag);
    }
  });

  return youtubeWindow.__lexoraYouTubeApiPromise;
}

function embedSource(embed: MediaEmbed, muted: boolean): ResolvedMediaEmbed | null {
  const title = embed.title || "Embedded video";
  const start = typeof embed.startTime === "number" ? Math.max(0, Math.floor(embed.startTime)) : 0;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  switch (embed.type) {
    case "youtube":
    case "youtube-short":
      if (!embed.id) {
        return null;
      }

      return {
        provider: "youtube",
        title,
        id: embed.id,
        start,
        muted,
        url: `https://www.youtube.com/embed/${encodeURIComponent(embed.id)}?rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ""}&mute=${muted ? "1" : "0"}${start ? `&start=${start}` : ""}`,
        watchUrl:
          embed.type === "youtube-short"
            ? `https://www.youtube.com/shorts/${embed.id}`
            : `https://www.youtube.com/watch?v=${embed.id}${start ? `&t=${start}s` : ""}`,
        kind: embed.type === "youtube-short" ? "portrait" : "landscape",
        supportsMuteToggle: true
      };
    case "instagram":
      if (!embed.id) {
        return null;
      }

      return {
        provider: "instagram",
        title,
        muted,
        url: `https://www.instagram.com/reel/${encodeURIComponent(embed.id)}/embed`,
        watchUrl: `https://www.instagram.com/reel/${embed.id}/`,
        kind: "portrait",
        supportsMuteToggle: false
      };
    case "facebook":
      if (!embed.id) {
        return null;
      }

      return {
        provider: "facebook",
        title,
        muted,
        url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(`https://www.facebook.com/reel/${embed.id}`)}&show_text=false&width=420&mute=${muted ? "1" : "0"}`,
        watchUrl: `https://www.facebook.com/reel/${embed.id}`,
        kind: "portrait",
        supportsMuteToggle: true
      };
    case "tiktok": {
      const videoId = tiktokVideoId(embed.url);

      if (!videoId) {
        return null;
      }

      return {
        provider: "tiktok",
        title,
        muted,
        url: `https://www.tiktok.com/embed/v2/${encodeURIComponent(videoId)}`,
        watchUrl: embed.url ?? `https://www.tiktok.com/@/video/${videoId}`,
        kind: "portrait",
        supportsMuteToggle: false
      };
    }
    default:
      return null;
  }
}

function isResolvedMediaEmbed(source: ReturnType<typeof embedSource>): source is ResolvedMediaEmbed {
  return source !== null;
}

function YouTubeEmbedFrame({
  muted,
  source
}: {
  muted: boolean;
  source: YouTubeResolvedMediaEmbed;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    getYouTubeApi().then((api) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      playerRef.current?.destroy();
      playerRef.current = new api.Player(containerRef.current, {
        videoId: source.id,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          start: source.start
        },
        events: {
          onReady(event) {
            const iframe = event.target.getIframe();
            iframe.style.cssText = "display:block;width:100%;height:100%;border:0;";

            if (muted) {
              event.target.mute();
            } else {
              event.target.unMute();
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [source.id, source.start]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    if (muted) {
      player.mute();
    } else {
      player.unMute();
    }
  }, [muted]);

  return <div className={styles.youtubePlayerSlot} ref={containerRef} />;
}

function FloatingMediaPlayer({
  onClose,
  source
}: {
  onClose: () => void;
  source: ResolvedMediaEmbed;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ pointerId: 0, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const [position, setPosition] = useState(() => ({
    x: typeof window === "undefined" ? 24 : Math.max(12, window.innerWidth - (source.kind === "portrait" ? 390 : 540)),
    y: typeof window === "undefined" ? 24 : Math.max(12, window.innerHeight - (source.kind === "portrait" ? 620 : 360))
  }));

  useEffect(() => {
    setPosition({
      x: Math.max(12, window.innerWidth - (source.kind === "portrait" ? 390 : 540)),
      y: Math.max(12, window.innerHeight - (source.kind === "portrait" ? 620 : 360))
    });
  }, [source]);

  function clampPosition(nextX: number, nextY: number) {
    const panel = panelRef.current;
    const rect = panel?.getBoundingClientRect();
    const width = rect?.width ?? 360;
    const height = rect?.height ?? 320;

    return {
      x: Math.min(Math.max(12, nextX), Math.max(12, window.innerWidth - width - 12)),
      y: Math.min(Math.max(12, nextY), Math.max(12, window.innerHeight - height - 12))
    };
  }

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: position.x,
      startTop: position.y
    };
  }

  function drag(event: React.PointerEvent<HTMLElement>) {
    if (dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    setPosition(clampPosition(dragRef.current.startLeft + deltaX, dragRef.current.startTop + deltaY));
  }

  function stopDrag(event: React.PointerEvent<HTMLElement>) {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.pointerId = 0;
    }
  }

  return (
    <aside
      className={`${styles.floatingMediaPlayer} ${
        source.kind === "portrait" ? styles.floatingMediaPortrait : styles.floatingMediaLandscape
      }`}
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      aria-label={`${source.title} floating video player`}
    >
      <header
        className={styles.floatingMediaHeader}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <strong>{source.title}</strong>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Close floating player"
          title="Close"
        >
          <X size={16} aria-hidden />
        </button>
      </header>
      <div className={styles.floatingMediaFrame}>
        {source.provider === "youtube" ? (
          <YouTubeEmbedFrame muted={source.muted} source={source} />
        ) : (
          <iframe
            src={source.url}
            title={source.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      <a href={source.watchUrl} target="_blank" rel="noreferrer noopener">
        Open original
      </a>
    </aside>
  );
}

function MediaEmbedCard({
  embed,
  onOpenFloating
}: {
  embed: MediaEmbed;
  onOpenFloating: (source: ResolvedMediaEmbed) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [copied, setCopied] = useState(false);
  const source = embedSource(embed, muted);

  if (!source) {
    return null;
  }

  const resolvedSource = source;

  async function copyLink() {
    await navigator.clipboard?.writeText(resolvedSource.watchUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <figure className={styles.mediaEmbedCard}>
      <div className={styles.mediaEmbedToolbar} aria-label={`${resolvedSource.title} video controls`}>
        <button type="button" onClick={copyLink} title="Copy video link">
          <Copy size={15} aria-hidden />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
        <button type="button" onClick={() => onOpenFloating(resolvedSource)} title="Open floating mini player">
          <PictureInPicture size={15} aria-hidden />
          <span>PiP</span>
        </button>
        <button
          type="button"
          onClick={() => setMuted((current) => !current)}
          disabled={!resolvedSource.supportsMuteToggle}
          title={resolvedSource.supportsMuteToggle ? (muted ? "Unmute video" : "Mute video") : "Mute is controlled inside this player"}
        >
          {muted ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
          <span>{muted ? "Muted" : "Mute"}</span>
        </button>
      </div>
      <div
        className={`${styles.mediaEmbedFrame} ${
          resolvedSource.kind === "portrait" ? styles.mediaEmbedPortrait : styles.mediaEmbedLandscape
        }`}
      >
        {resolvedSource.provider === "youtube" ? (
          <YouTubeEmbedFrame muted={muted} source={resolvedSource} />
        ) : (
          <iframe
            src={resolvedSource.url}
            title={resolvedSource.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      {resolvedSource.title ? <figcaption>{resolvedSource.title}</figcaption> : null}
    </figure>
  );
}

function MediaEmbeds({ embeds }: { embeds: readonly MediaEmbed[] }) {
  const [floatingSource, setFloatingSource] = useState<ResolvedMediaEmbed | null>(null);
  const sources = embeds.map((embed) => embedSource(embed, true)).filter(isResolvedMediaEmbed);

  if (sources.length === 0) {
    return null;
  }

  return (
    <section className={styles.mediaEmbeds} aria-labelledby="media-embeds-title">
      <div className={styles.mediaEmbedsHeader}>
        <PlayCircle size={20} aria-hidden />
        <h2 id="media-embeds-title">Videos</h2>
      </div>
      <div className={styles.mediaEmbedGrid}>
        {embeds.map((embed, index) => (
          <MediaEmbedCard
            embed={embed}
            key={`${embed.type}-${embed.id ?? embed.url ?? index}`}
            onOpenFloating={setFloatingSource}
          />
        ))}
      </div>
      {floatingSource ? (
        <FloatingMediaPlayer source={floatingSource} onClose={() => setFloatingSource(null)} />
      ) : null}
    </section>
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
        <MediaEmbeds embeds={doc.mediaEmbeds} />
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
