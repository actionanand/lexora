"use client";

import { MermaidBlock } from "@/components/mdx/MermaidBlock";
import styles from "@/components/mdx/MarkdownRenderer.module.css";
import { articleImageSources } from "@/generated/article-image-sources.generated";
import { imageWordSources } from "@/generated/image-word-sources.generated";
import {
  remarkArticleImages,
  remarkCallouts,
  remarkCharacterDialogues,
  remarkEmojiCards,
  remarkExplore,
  remarkHighlights,
  remarkImageWords,
  remarkIcons,
  remarkLetterCards,
  remarkLetterGrid,
  remarkSentenceCards,
  remarkTextWords
} from "@/lib/mdx/plugins";
import { withBasePath } from "@/lib/base-path";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function preprocessRevealBlanks(source: string): string {
  // Scan positions of fenced code blocks and inline code spans so we can skip
  // [[...]] patterns that are literally inside code (e.g. in a code example).
  // Inline code that appears *inside* [[...]] is fine — it should not be skipped.
  const codeRanges: [number, number][] = [];
  const codePat = /```[\s\S]*?```|`[^`\n]+`/g;
  let cm: RegExpExecArray | null;

  while ((cm = codePat.exec(source)) !== null) {
    codeRanges.push([cm.index, cm.index + cm[0].length]);
  }

  // A [[...]] is "inside" a code block/span only when its own start position
  // falls within a code range.  A code span that lives inside [[...]] does NOT
  // disqualify the outer pattern.
  const startsInCode = (pos: number) =>
    codeRanges.some(([cs, ce]) => pos >= cs && pos < ce);

  const pattern = /\[\[([^\][\n]+)\]\]/g;
  const parts: string[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    if (startsInCode(match.index)) {
      continue; // leave the [[...]] untouched inside a code example
    }

    parts.push(source.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const inner = match[1];
    const sepIdx = inner.indexOf("|");
    let answer: string;
    let template: string;

    if (sepIdx === -1) {
      answer = inner.trim();
      template = "";
    } else {
      answer = inner.slice(0, sepIdx).trim();
      template = inner.slice(sepIdx + 1);
    }

    let prefix = "";
    let suffix = "";

    if (template) {
      const blankMatch = /_{3,}/.exec(template);
      if (!blankMatch) {
        prefix = template.endsWith(" ") ? template : `${template} `;
      } else {
        prefix = template.slice(0, blankMatch.index);
        suffix = template.slice(blankMatch.index + blankMatch[0].length);
      }
    }

    parts.push(
      `<lexora-blank answer="${escapeAttr(answer)}" prefix="${escapeAttr(prefix)}" suffix="${escapeAttr(suffix)}"></lexora-blank>`
    );
  }

  parts.push(source.slice(cursor));
  return parts.join("");
}

function renderInlineMarkdown(text: string): ReactNode {
  if (!text) return null;
  const pieces: ReactNode[] = [];
  // Order matters: ** before * so bold is matched first
  const pattern = /\*\*(.+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`|==(.+?)==/g;
  let cursor = 0;
  let match;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      pieces.push(text.slice(cursor, match.index));
    }
    const key = `ilmd-${idx++}`;
    if (match[1] !== undefined) {
      pieces.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      pieces.push(<em key={key}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      pieces.push(<code key={key}>{match[3]}</code>);
    } else if (match[4] !== undefined) {
      pieces.push(<HighlightText key={key} raw={match[4]} />);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    pieces.push(text.slice(cursor));
  }
  if (pieces.length === 0) return null;
  if (pieces.length === 1 && typeof pieces[0] === "string") return pieces[0] as string;
  return <>{pieces}</>;
}

function RevealBlank({
  answer,
  prefix,
  suffix
}: {
  answer?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const label = revealed ? "Hide answer" : "Reveal answer";

  return (
    <span className={styles.revealPractice}>
      {prefix ? <span>{renderInlineMarkdown(prefix)}</span> : null}
      <span className={`${styles.revealBlank} ${revealed ? styles.revealBlankOpen : ""}`}>
        <span className={styles.blankText}>{revealed ? answer : null}</span>
      </span>
      {suffix ? <span>{renderInlineMarkdown(suffix)}</span> : null}
      <button
        className={styles.revealButton}
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={label}
        title={label}
      >
        {revealed ? <Icons.EyeOff size={16} aria-hidden /> : <Icons.Eye size={16} aria-hidden />}
      </button>
    </span>
  );
}

function InlineIcon({ name }: { name?: string }) {
  const icons = Icons as unknown as Record<string, LucideIcon>;
  const Icon = name ? icons[name] : undefined;
  const Component = Icon ?? Icons.Sparkles;

  return <Component className={styles.inlineIcon} size={18} aria-hidden />;
}

function CalloutIcon({ type }: { type: string }) {
  const iconProps = { className: styles.calloutIcon, size: 22, "aria-hidden": true };

  switch (type) {
    case "tip":
      return <Icons.Rocket {...iconProps} />;
    case "info":
      return <Icons.Info {...iconProps} />;
    case "caution":
    case "warning":
      return <Icons.TriangleAlert {...iconProps} />;
    case "danger":
      return <Icons.Flame {...iconProps} />;
    case "note":
    default:
      return <Icons.Bookmark {...iconProps} />;
  }
}

const characterAvatars: Record<string, { label: string; image: string }> = {
  mentor: { label: "Mentor", image: "/admonitions/owl.webp" },
  learner: { label: "Learner", image: "/admonitions/unicorn.webp" },
  guide: { label: "Guide", image: "/admonitions/duck.webp" },
  owl: { label: "Owl", image: "/admonitions/owl.webp" },
  unicorn: { label: "Unicorn", image: "/admonitions/unicorn.webp" },
  duck: { label: "Duck", image: "/admonitions/duck.webp" },
  boy: { label: "Boy", image: "/admonitions/boy.png" },
  girl: { label: "Girl", image: "/admonitions/girl.png" }
};

function CharacterDialogue({
  align,
  character,
  children
}: {
  align?: string;
  character: string;
  children?: ReactNode;
}) {
  const avatar = characterAvatars[character] ?? {
    label: character,
    image: "/admonitions/duck.webp"
  };
  const alignClass =
    align === "right" ? styles.characterRight : align === "left" ? styles.characterLeft : "";

  return (
    <aside
      className={`${styles.characterDialogue} ${alignClass}`}
      aria-label={`Character dialogue: ${avatar.label}`}
    >
      <img
        className={styles.characterAvatar}
        src={withBasePath(avatar.image)}
        alt=""
        width={96}
        height={96}
        loading="lazy"
        aria-hidden
      />
      <div className={styles.characterBubble}>{children}</div>
    </aside>
  );
}

function EmojiCard({
  emoji,
  label,
  meaning,
  meaningTamil,
  size,
  transliteration
}: {
  emoji?: string;
  label?: string;
  meaning?: string;
  meaningTamil?: string;
  size?: string;
  transliteration?: string;
}) {
  const sizeClass =
    size === "huge"
      ? styles.emojiHuge
      : size === "big"
        ? styles.emojiBig
        : size === "normal"
          ? styles.emojiNormal
          : styles.emojiMedium;

  return (
    <span className={`${styles.emojiCard} ${sizeClass}`} role="group" aria-label={label || emoji}>
      <span className={styles.emojiSymbol} role="img" aria-label={label || emoji}>
        {emoji}
      </span>
      <span className={styles.emojiText}>
        <span className={styles.wordSource}>
          {label ? <span className={styles.emojiLabel}>{label}</span> : null}
          {transliteration ? (
            <span className={styles.emojiTransliteration}>({transliteration})</span>
          ) : null}
        </span>
        <span className={styles.wordDivider} aria-hidden>
          -
        </span>
        <span className={styles.wordMeaningGroup}>
          {meaning ? <span className={styles.emojiMeaning}>{meaning}</span> : null}
          {meaningTamil ? <span className={styles.emojiTamilMeaning}>{meaningTamil}</span> : null}
        </span>
      </span>
    </span>
  );
}

function normalizeImageWordKey(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toLowerCase();
}

function renderableImageSource(value: string | undefined, format?: string) {
  const source = value?.trim();

  if (!source) {
    return undefined;
  }

  if (source.startsWith("data:")) {
    return source;
  }

  if (format === "svg" || source.startsWith("<svg") || source.startsWith("<?xml")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;
  }

  return source;
}

function ImageWordCard({
  format,
  image,
  label,
  meaning,
  meaningTamil,
  size,
  transliteration
}: {
  format?: string;
  image?: string;
  label?: string;
  meaning?: string;
  meaningTamil?: string;
  size?: string;
  transliteration?: string;
}) {
  const imageKey = normalizeImageWordKey(image ?? "");
  const imageFormat = normalizeImageWordKey(format ?? "");
  const sources = imageWordSources as Record<string, string>;
  const imageSource = imageFormat
    ? sources[`${imageFormat}:${imageKey}`]
    : sources[imageKey] ?? sources[`png:${imageKey}`] ?? sources[`svg:${imageKey}`];
  const src = renderableImageSource(imageSource, imageFormat);
  const sizeClass =
    size === "normal"
      ? styles.imageWordNormal
      : size === "medium"
        ? styles.imageWordMedium
        : size === "big"
        ? styles.imageWordBig
        : styles.imageWordHuge;
  const readableLabel = [label, transliteration, meaning, meaningTamil].filter(Boolean).join(" ");

  if (!src) {
    return null;
  }

  return (
    <span className={`${styles.imageWord} ${sizeClass}`} role="group" aria-label={readableLabel}>
      <img className={styles.imageWordImage} src={src} alt="" loading="lazy" aria-hidden />
      <span className={styles.imageWordText}>
        <span className={styles.wordSource}>
          {label ? <span className={styles.imageWordLabel}>{label}</span> : null}
          {transliteration ? (
            <span className={styles.imageWordTransliteration}>({transliteration})</span>
          ) : null}
        </span>
        <span className={styles.wordDivider} aria-hidden>
          -
        </span>
        <span className={styles.wordMeaningGroup}>
          {meaning ? <span className={styles.imageWordMeaning}>{meaning}</span> : null}
          {meaningTamil ? <span className={styles.imageWordTamilMeaning}>{meaningTamil}</span> : null}
        </span>
      </span>
    </span>
  );
}

function TextWordCard({
  label,
  meaning,
  meaningTamil,
  size,
  transliteration
}: {
  label?: string;
  meaning?: string;
  meaningTamil?: string;
  size?: string;
  transliteration?: string;
}) {
  const sizeClass =
    size === "normal"
      ? styles.textWordNormal
      : size === "medium"
        ? styles.textWordMedium
        : size === "big"
          ? styles.textWordBig
          : styles.textWordHuge;
  const readableLabel = [label, transliteration, meaning, meaningTamil].filter(Boolean).join(" ");

  return (
    <span className={`${styles.textWord} ${sizeClass}`} role="group" aria-label={readableLabel}>
      <span className={styles.wordSource}>
        {label ? <span className={styles.textWordLabel}>{label}</span> : null}
        {transliteration ? (
          <span className={styles.textWordTransliteration}>({transliteration})</span>
        ) : null}
      </span>
      <span className={styles.wordDivider} aria-hidden>
        -
      </span>
      <span className={styles.wordMeaningGroup}>
        {meaning ? <span className={styles.textWordMeaning}>{meaning}</span> : null}
        {meaningTamil ? <span className={styles.textWordTamilMeaning}>{meaningTamil}</span> : null}
      </span>
    </span>
  );
}

const highlightModes = new Set(["bg", "fg", "dual", "lightbg", "light-bg", "lightBg", "format"]);
const textAlignments = new Set(["left", "center", "right", "justify", "start", "end"]);

function normalizedHighlightMode(value?: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return "";
  }

  if (normalized === "lightBg" || normalized === "light-bg" || normalized.toLowerCase() === "lightbg") {
    return "lightBg";
  }

  return normalized.toLowerCase();
}

function isHighlightMode(value?: string) {
  return highlightModes.has(value ?? "") || highlightModes.has(normalizedHighlightMode(value));
}

function safeCssColor(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    /^(#[0-9a-f]{3,8}|[a-zA-Z]+|rgba?\([0-9\s,%.]+\)|hsla?\([0-9\s,%.degturnrad+-]+\))$/i.test(trimmed)
  ) {
    return trimmed;
  }

  return undefined;
}

function safeFontWeight(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return /^(normal|bold|lighter|bolder|[1-9]00)$/i.test(trimmed) ? trimmed : undefined;
}

function safeFontStyle(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return /^(normal|italic|oblique)$/i.test(trimmed) ? trimmed : undefined;
}

function safeTextAlign(value?: string): CSSProperties["textAlign"] | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return textAlignments.has(trimmed) ? (trimmed as CSSProperties["textAlign"]) : undefined;
}

function parseHighlight(raw?: string) {
  const [text = "", ...options] = (raw ?? "").split("|");
  let mode = options.length > 0 ? "bg" : "default";
  let color = options[0] ?? "";
  let backgroundColor = "";
  let styleStart = 1;

  if (normalizedHighlightMode(options[2]) === "dual") {
    mode = "dual";
    backgroundColor = options[1] ?? "";
    styleStart = 3;
  } else if (isHighlightMode(options[1])) {
    mode = normalizedHighlightMode(options[1]);
    styleStart = 2;

    if (mode === "dual") {
      backgroundColor = options[2] ?? "";
      styleStart = 3;
    }
  }

  const styleParts = options.slice(styleStart);
  let fontWeight = safeFontWeight(styleParts[0]);
  let fontStyle = safeFontStyle(styleParts[1]);
  let textAlign = safeTextAlign(styleParts[2] || styleParts[3]);

  if (!fontWeight && !fontStyle && !textAlign) {
    textAlign = safeTextAlign(styleParts[0]);
    fontStyle = safeFontStyle(styleParts[0]);
  }

  return {
    text,
    mode,
    color,
    backgroundColor,
    fontWeight,
    fontStyle,
    textAlign
  };
}

function HighlightText({ raw }: { raw?: string }) {
  const highlight = parseHighlight(raw);
  const color = safeCssColor(highlight.color);
  const backgroundColor = safeCssColor(highlight.backgroundColor);
  const style: CSSProperties = {
    fontWeight: highlight.fontWeight,
    fontStyle: highlight.fontStyle,
    textAlign: highlight.textAlign
  };

  if (highlight.mode === "bg" && color) {
    style.backgroundColor = color;
    style.color = "#fff";
  }

  if (highlight.mode === "fg" && color) {
    style.color = color;
  }

  if (highlight.mode === "dual") {
    style.color = color;
    style.backgroundColor = backgroundColor;
  }

  if (highlight.mode === "lightBg") {
    style.backgroundColor = color ?? "#d1ffbd";
    style.color = "#4b0082";
  }

  if (highlight.mode === "format" && color) {
    style.color = color;
  }

  const className = [
    styles.highlight,
    highlight.mode === "default" ? styles.highlightDefault : "",
    highlight.mode === "bg" ? styles.highlightBg : "",
    highlight.mode === "fg" ? styles.highlightFg : "",
    highlight.mode === "dual" ? styles.highlightDual : "",
    highlight.mode === "lightBg" ? styles.highlightLightBg : "",
    highlight.mode === "format" ? styles.highlightFormat : "",
    highlight.textAlign ? styles.highlightBlock : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className} style={style}>
      {highlight.text}
    </span>
  );
}

function highlightedParts(value: string) {
  const parts: ReactNode[] = [];
  const pattern = /==(.+?)==/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) {
      parts.push(value.slice(cursor, match.index));
    }

    parts.push(<HighlightText raw={match[1]} key={`${match.index}-${match[1]}`} />);
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    parts.push(value.slice(cursor));
  }

  return parts.length > 0 ? parts : value;
}

function SentenceCard({
  meaning,
  meaningTamil,
  sentence,
  transliteration
}: {
  meaning?: string;
  meaningTamil?: string;
  sentence?: string;
  transliteration?: string;
}) {
  const splitLayout = Boolean(transliteration && meaning && meaningTamil);
  const readableLabel = [sentence?.replace(/==(.+?)==/g, (_, value) => parseHighlight(value).text), transliteration, meaning, meaningTamil]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={`${styles.sentenceCard} ${splitLayout ? styles.sentenceSplit : styles.sentenceStack}`}
      role="group"
      aria-label={readableLabel}
    >
      {splitLayout ? (
        <>
          <span className={styles.sentenceSource}>
            {sentence ? <span className={styles.sentenceText}>{highlightedParts(sentence)}</span> : null}
            {transliteration ? (
              <span className={styles.sentenceTransliteration}>({transliteration})</span>
            ) : null}
          </span>
          <span className={styles.wordDivider} aria-hidden>
            -
          </span>
          <span className={styles.wordMeaningGroup}>
            {meaning ? <span className={styles.sentenceMeaning}>{meaning}</span> : null}
            {meaningTamil ? <span className={styles.sentenceTamilMeaning}>{meaningTamil}</span> : null}
          </span>
        </>
      ) : (
        <>
          {sentence ? <span className={styles.sentenceText}>{highlightedParts(sentence)}</span> : null}
          {transliteration ? (
            <span className={styles.sentenceTransliteration}>({transliteration})</span>
          ) : null}
          {meaning ? <span className={styles.sentenceMeaning}>{meaning}</span> : null}
          {meaningTamil ? <span className={styles.sentenceTamilMeaning}>{meaningTamil}</span> : null}
        </>
      )}
    </span>
  );
}

function boolProp(value?: string) {
  return value === "true";
}

function LetterCard({
  glyph,
  transliteration,
  meaning,
  highlight,
  size
}: {
  glyph?: string;
  transliteration?: string;
  meaning?: string;
  highlight?: string;
  size?: string;
}) {
  const sizeClass =
    size === "big" ? styles.letterBig : size === "small" ? styles.letterSmall : styles.letterNormal;
  const readableLabel = [glyph, transliteration, meaning].filter(Boolean).join(" ");

  return (
    <span
      className={`${styles.letterCard} ${sizeClass} ${highlight === "true" ? styles.letterCardHighlight : ""}`}
      role="group"
      aria-label={readableLabel}
    >
      <span className={styles.letterGlyph}>{glyph}</span>
      {transliteration ? <span className={styles.letterTranslit}>{transliteration}</span> : null}
      {meaning ? <span className={styles.letterMeaning}>{meaning}</span> : null}
    </span>
  );
}

type LetterGridItem = {
  glyph: string;
  transliteration: string;
  highlighted: boolean;
};

function parseLetterGridItems(raw?: string): LetterGridItem[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const highlighted = chunk.startsWith("*");
      const body = highlighted ? chunk.slice(1) : chunk;
      const separator = body.indexOf("=");
      const glyph = (separator === -1 ? body : body.slice(0, separator)).trim();
      const transliteration = separator === -1 ? "" : body.slice(separator + 1).trim();

      return { glyph, transliteration, highlighted };
    });
}

function LetterGrid({
  title,
  items,
  rows,
  cols,
  layout,
  variant
}: {
  title?: string;
  items?: string;
  rows?: string;
  cols?: string;
  layout?: string;
  variant?: string;
}) {
  const parsed = parseLetterGridItems(items);
  const colCount = Number.parseInt(cols ?? "", 10);
  const useColumns = Number.isFinite(colCount) && colCount > 0;
  const rowCount = Math.max(1, Number.parseInt(rows ?? "4", 10) || 4);
  const cellStyle: CSSProperties = useColumns
    ? { gridTemplateColumns: `repeat(${colCount}, auto)`, gridAutoFlow: "row" }
    : { gridTemplateRows: `repeat(${rowCount}, auto)`, gridAutoFlow: "column" };
  const isStacked = layout === "stack";
  const readableLabel = [title, ...parsed.map((item) => `${item.glyph} ${item.transliteration}`)]
    .filter(Boolean)
    .join(" ");

  if (parsed.length === 0) {
    return null;
  }

  return (
    <span
      className={`${styles.letterGridBoard} ${variant === "plain" ? styles.letterGridPlain : ""}`}
      role="group"
      aria-label={readableLabel}
    >
      {title ? <span className={styles.letterGridTitle}>{title}</span> : null}
      <span
        className={`${styles.letterGridCells} ${isStacked ? styles.letterGridStack : ""}`}
        style={cellStyle}
      >
        {parsed.map((item, index) => (
          <span
            key={`${item.glyph}-${index}`}
            className={`${styles.letterGridCell} ${item.highlighted ? styles.letterGridCellHighlight : ""}`}
          >
            <span className={styles.letterGridGlyph}>{item.glyph}</span>
            {item.transliteration ? (
              <span className={styles.letterGridTranslit}>{item.transliteration}</span>
            ) : null}
          </span>
        ))}
      </span>
    </span>
  );
}

function dimensionValue(value?: string) {
  if (!value) {
    return undefined;
  }

  return /^\d+$/.test(value) ? `${value}px` : value;
}

function ArticleImage({
  align,
  alt,
  bordered,
  caption,
  fit,
  format,
  height,
  image,
  loading,
  rounded,
  shadow,
  width
}: {
  align?: string;
  alt?: string;
  bordered?: string;
  caption?: string;
  fit?: string;
  format?: string;
  height?: string;
  image?: string;
  loading?: string;
  rounded?: string;
  shadow?: string;
  width?: string;
}) {
  const imageKey = normalizeImageWordKey(image ?? "");
  const imageFormat = normalizeImageWordKey(format ?? "");
  const src = renderableImageSource(
    (articleImageSources as Record<string, string>)[`${imageFormat}:${imageKey}`],
    imageFormat
  );
  const alignClass =
    align === "left" ? styles.articleImageLeft : align === "right" ? styles.articleImageRight : styles.articleImageCenter;
  const className = [
    styles.articleImageFigure,
    alignClass,
    boolProp(shadow) ? styles.articleImageShadow : "",
    boolProp(bordered) ? styles.articleImageBordered : "",
    boolProp(rounded) ? styles.articleImageRounded : ""
  ]
    .filter(Boolean)
    .join(" ");
  const imageWidth = dimensionValue(width);
  const imageHeight = dimensionValue(height);
  const imageStyle: CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    maxHeight: imageHeight,
    objectFit: fit === "cover" ? "cover" : "contain"
  };

  if (!src) {
    return null;
  }

  return (
    <span className={className} role="figure" aria-label={caption || alt || image}>
      <img
        className={styles.articleImage}
        src={src}
        alt={alt ?? ""}
        loading={loading === "eager" ? "eager" : "lazy"}
        style={imageStyle}
      />
      {caption ? <span className={styles.articleImageCaption}>{caption}</span> : null}
    </span>
  );
}

type MarkdownNode = {
  properties?: Record<string, unknown>;
};

type CodeProps = {
  className?: string;
  children?: ReactNode;
};

type NodeProps = {
  children?: ReactNode;
  node?: MarkdownNode;
};

function nodeProperty(node: MarkdownNode | undefined, key: string) {
  const value = node?.properties?.[key];

  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

const markdownComponents = {
  a({ href, children }: { href?: string; children?: ReactNode }) {
    const isExternal = /^https?:\/\//i.test(href ?? "");

    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer noopener" : undefined}
      >
        {children}
      </a>
    );
  },
  code({ className, children }: CodeProps) {
    return <code className={className}>{children}</code>;
  },
  pre({ children }: NodeProps) {
    const child = isValidElement(children) ? (children as ReactElement<CodeProps>) : null;
    const className = child?.props.className;
    const language = /language-(\w+)/.exec(className ?? "")?.[1];
    const content = String(child?.props.children ?? "").replace(/\n$/, "");

    if (language === "mermaid") {
      return <MermaidBlock source={content} />;
    }

    return <pre className={styles.codeBlock}>{children}</pre>;
  },
  aside({ children, node }: NodeProps) {
    const character = nodeProperty(node, "dataCharacter");

    if (character) {
      return (
        <CharacterDialogue
          character={character}
          align={nodeProperty(node, "dataAlign")}
        >
          {children}
        </CharacterDialogue>
      );
    }

    const isExplore = nodeProperty(node, "dataExplore");

    if (isExplore) {
      return (
        <aside className={styles.explore}>
          <div className={styles.exploreTitle}>
            <Icons.Compass size={20} aria-hidden />
            <strong>Explore Further</strong>
          </div>
          <div className={styles.exploreLinks}>{children}</div>
        </aside>
      );
    }

    const calloutType = nodeProperty(node, "dataCallout") || "note";
    const calloutTitle = nodeProperty(node, "dataCalloutTitle") || calloutType;

    return (
      <aside className={`${styles.callout} ${styles[calloutType] ?? ""}`}>
        <div className={styles.calloutTitle}>
          <CalloutIcon type={calloutType} />
          <strong>{calloutTitle}</strong>
        </div>
        <div>{children}</div>
      </aside>
    );
  },
  "lexora-blank"({ node }: NodeProps) {
    return (
      <RevealBlank
        answer={nodeProperty(node, "answer")}
        prefix={nodeProperty(node, "prefix")}
        suffix={nodeProperty(node, "suffix")}
      />
    );
  },
  "lexora-icon"({ node }: NodeProps) {
    return <InlineIcon name={nodeProperty(node, "name")} />;
  },
  "lexora-highlight"({ node }: NodeProps) {
    return <HighlightText raw={nodeProperty(node, "raw")} />;
  },
  "lexora-emoji"({ node }: NodeProps) {
    return (
      <EmojiCard
        emoji={nodeProperty(node, "emoji")}
        label={nodeProperty(node, "label")}
        meaning={nodeProperty(node, "meaning")}
        meaningTamil={nodeProperty(node, "meaningTamil")}
        size={nodeProperty(node, "size")}
        transliteration={nodeProperty(node, "transliteration")}
      />
    );
  },
  "lexora-image-word"({ node }: NodeProps) {
    return (
      <ImageWordCard
        format={nodeProperty(node, "format")}
        image={nodeProperty(node, "image")}
        label={nodeProperty(node, "label")}
        meaning={nodeProperty(node, "meaning")}
        meaningTamil={nodeProperty(node, "meaningTamil")}
        size={nodeProperty(node, "size")}
        transliteration={nodeProperty(node, "transliteration")}
      />
    );
  },
  "lexora-text-word"({ node }: NodeProps) {
    return (
      <TextWordCard
        label={nodeProperty(node, "label")}
        meaning={nodeProperty(node, "meaning")}
        meaningTamil={nodeProperty(node, "meaningTamil")}
        size={nodeProperty(node, "size")}
        transliteration={nodeProperty(node, "transliteration")}
      />
    );
  },
  "lexora-sentence"({ node }: NodeProps) {
    return (
      <SentenceCard
        meaning={nodeProperty(node, "meaning")}
        meaningTamil={nodeProperty(node, "meaningTamil")}
        sentence={nodeProperty(node, "sentence")}
        transliteration={nodeProperty(node, "transliteration")}
      />
    );
  },
  "lexora-letter"({ node }: NodeProps) {
    return (
      <LetterCard
        glyph={nodeProperty(node, "glyph")}
        transliteration={nodeProperty(node, "transliteration")}
        meaning={nodeProperty(node, "meaning")}
        highlight={nodeProperty(node, "highlight")}
        size={nodeProperty(node, "size")}
      />
    );
  },
  "lexora-letter-grid"({ node }: NodeProps) {
    return (
      <LetterGrid
        title={nodeProperty(node, "title")}
        items={nodeProperty(node, "items")}
        rows={nodeProperty(node, "rows")}
        cols={nodeProperty(node, "cols")}
        layout={nodeProperty(node, "layout")}
        variant={nodeProperty(node, "variant")}
      />
    );
  },
  "lexora-article-image"({ node }: NodeProps) {
    return (
      <ArticleImage
        align={nodeProperty(node, "align")}
        alt={nodeProperty(node, "alt")}
        bordered={nodeProperty(node, "bordered")}
        caption={nodeProperty(node, "caption")}
        fit={nodeProperty(node, "fit")}
        format={nodeProperty(node, "format")}
        height={nodeProperty(node, "height")}
        image={nodeProperty(node, "image")}
        loading={nodeProperty(node, "loading")}
        rounded={nodeProperty(node, "rounded")}
        shadow={nodeProperty(node, "shadow")}
        width={nodeProperty(node, "width")}
      />
    );
  }
} as unknown as Components;

export function MarkdownRenderer({ source }: { source: string }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkDirective,
          remarkArticleImages,
          remarkExplore,
          remarkCallouts,
          remarkCharacterDialogues,
          remarkEmojiCards,
          remarkHighlights,
          remarkImageWords,
          remarkIcons,
          remarkLetterCards,
          remarkLetterGrid,
          remarkSentenceCards,
          remarkTextWords
        ]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {preprocessRevealBlanks(source)}
      </ReactMarkdown>
    </div>
  );
}
