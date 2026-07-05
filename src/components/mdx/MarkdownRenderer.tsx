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
  remarkHighlights,
  remarkImageWords,
  remarkIcons,
  remarkRevealBlanks,
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
      {prefix ? <span>{prefix}</span> : null}
      <span className={`${styles.revealBlank} ${revealed ? styles.revealBlankOpen : ""}`}>
        <span className={styles.blankText}>{revealed ? answer : null}</span>
      </span>
      {suffix ? <span>{suffix}</span> : null}
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
          remarkCallouts,
          remarkCharacterDialogues,
          remarkEmojiCards,
          remarkHighlights,
          remarkImageWords,
          remarkIcons,
          remarkRevealBlanks,
          remarkSentenceCards,
          remarkTextWords
        ]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
