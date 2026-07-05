"use client";

import { MermaidBlock } from "@/components/mdx/MermaidBlock";
import styles from "@/components/mdx/MarkdownRenderer.module.css";
import {
  remarkCallouts,
  remarkCharacterDialogues,
  remarkEmojiCards,
  remarkIcons,
  remarkRevealBlanks
} from "@/lib/mdx/plugins";
import { withBasePath } from "@/lib/base-path";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
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
  duck: { label: "Duck", image: "/admonitions/duck.webp" }
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
  size,
  transliteration
}: {
  emoji?: string;
  label?: string;
  meaning?: string;
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
        {label ? <span className={styles.emojiLabel}>{label}</span> : null}
        {transliteration ? (
          <span className={styles.emojiTransliteration}>({transliteration})</span>
        ) : null}
        {meaning ? <span className={styles.emojiMeaning}>{meaning}</span> : null}
      </span>
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

  return typeof value === "string" ? value : "";
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
  "lexora-emoji"({ node }: NodeProps) {
    return (
      <EmojiCard
        emoji={nodeProperty(node, "emoji")}
        label={nodeProperty(node, "label")}
        meaning={nodeProperty(node, "meaning")}
        size={nodeProperty(node, "size")}
        transliteration={nodeProperty(node, "transliteration")}
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
          remarkCallouts,
          remarkCharacterDialogues,
          remarkEmojiCards,
          remarkIcons,
          remarkRevealBlanks
        ]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
