"use client";

import mermaid from "mermaid";
import { useEffect, useId, useState } from "react";
import styles from "@/components/mdx/MarkdownRenderer.module.css";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  fontFamily: "inherit"
});

export function MermaidBlock({ source }: { source: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const result = await mermaid.render(`lexora-${id}`, source);

        if (!cancelled) {
          setSvg(result.svg);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setSvg("");
          setError("Unable to render diagram.");
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return <pre className={styles.codeBlock}>{source}</pre>;
  }

  return (
    <div
      className={styles.mermaid}
      aria-label="Mermaid diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
