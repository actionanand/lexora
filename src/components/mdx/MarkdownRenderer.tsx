"use client";

import { MermaidBlock } from "@/components/mdx/MermaidBlock";
import styles from "@/components/mdx/MarkdownRenderer.module.css";
import { remarkCallouts, remarkIcons, remarkRevealBlanks } from "@/lib/mdx/plugins";
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

function RevealBlank({ answer }: { answer?: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      className={`${styles.blank} ${revealed ? styles.blankRevealed : ""}`}
      type="button"
      onClick={() => setRevealed(true)}
    >
      {revealed ? answer : "Reveal"}
    </button>
  );
}

function InlineIcon({ name }: { name?: string }) {
  const icons = Icons as unknown as Record<string, LucideIcon>;
  const Icon = name ? icons[name] : undefined;
  const Component = Icon ?? Icons.Sparkles;

  return <Component className={styles.inlineIcon} size={18} aria-hidden />;
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
    const calloutType = nodeProperty(node, "dataCallout") || "note";

    return (
      <aside className={`${styles.callout} ${styles[calloutType] ?? ""}`}>
        <strong>{calloutType}</strong>
        <div>{children}</div>
      </aside>
    );
  },
  "lexora-blank"({ node }: NodeProps) {
    return <RevealBlank answer={nodeProperty(node, "answer")} />;
  },
  "lexora-icon"({ node }: NodeProps) {
    return <InlineIcon name={nodeProperty(node, "name")} />;
  }
} as unknown as Components;

export function MarkdownRenderer({ source }: { source: string }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkCallouts, remarkIcons, remarkRevealBlanks]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={markdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
