import { visit } from "unist-util-visit";
import type { Node, Parent } from "unist";

const CALLOUTS = new Set(["note", "tip", "info", "caution", "warning", "danger"]);
const CHARACTERS = new Set(["mentor", "learner", "guide", "owl", "unicorn", "duck", "boy", "girl"]);

const EMOJI_NAMES: Record<string, string> = {
  apple: "🍎",
  book: "📘",
  boy: "👦",
  calendar: "📅",
  city: "🏙️",
  family: "👨‍👩‍👧‍👦",
  flower: "🌸",
  food: "🍚",
  friend: "🤝",
  girl: "👧",
  hello: "🙏",
  house: "🏠",
  leaf: "🍃",
  light: "💡",
  listen: "👂",
  moon: "🌙",
  mountain: "⛰️",
  pen: "✍️",
  question: "❓",
  read: "📖",
  school: "🏫",
  sound: "🔊",
  speak: "🗣️",
  star: "⭐",
  sun: "☀️",
  teacher: "🧑‍🏫",
  tree: "🌳",
  water: "💧",
  word: "🔤"
};

function emojiValue(value?: string) {
  const trimmed = value?.trim() ?? "";

  return EMOJI_NAMES[trimmed.toLowerCase()] ?? trimmed;
}

type MdxNode = Node & {
  name?: string;
  value?: string;
  attributes?: Record<string, string>;
  children?: MdxNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    directiveLabel?: boolean;
  };
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function remarkHighlights() {
  return (tree: MdxNode) => {
    visit(tree, "text", (node: MdxNode, index: number | undefined, parent: Parent) => {
      if (
        typeof index !== "number" ||
        !parent ||
        !node.value?.includes("==") ||
        parent.type === "textDirective"
      ) {
        return;
      }

      const pieces = [];
      const pattern = /==(.+?)==/g;
      let cursor = 0;
      let match;

      while ((match = pattern.exec(node.value)) !== null) {
        if (match.index > cursor) {
          pieces.push({
            type: "text",
            value: node.value.slice(cursor, match.index)
          });
        }

        pieces.push({
          type: "html",
          value: `<lexora-highlight raw="${escapeHtml(match[1])}"></lexora-highlight>`
        });

        cursor = match.index + match[0].length;
      }

      if (cursor < node.value.length) {
        pieces.push({
          type: "text",
          value: node.value.slice(cursor)
        });
      }

      parent.children.splice(index, 1, ...pieces);
    });
  };
}

function revealParts(value: string) {
  const separatorIndex = value.indexOf("|");

  if (separatorIndex === -1) {
    return {
      answer: value,
      prefix: "",
      suffix: ""
    };
  }

  const answer = value.slice(0, separatorIndex).trim();
  const template = value.slice(separatorIndex + 1);
  const blankMatch = /_{3,}/.exec(template);

  if (!blankMatch) {
    return {
      answer,
      prefix: template.endsWith(" ") ? template : `${template} `,
      suffix: ""
    };
  }

  return {
    answer,
    prefix: template.slice(0, blankMatch.index),
    suffix: template.slice(blankMatch.index + blankMatch[0].length)
  };
}

function calloutTitle(type: string) {
  switch (type) {
    case "tip":
      return "Tip";
    case "info":
      return "Info";
    case "caution":
    case "warning":
      return "Caution";
    case "danger":
      return "Danger";
    case "note":
    default:
      return "Note";
  }
}

function readDirectiveLabel(node: MdxNode) {
  const label = node.children?.find(
    (child) =>
      child.type === "paragraph" &&
      (child.data?.directiveLabel === true || child.data?.hProperties?.directiveLabel === true)
  );
  const text = label?.children?.[0]?.value?.trim();

  if (label) {
    node.children = node.children?.filter((child) => child !== label);
  }

  return text || null;
}

function hasUsefulText(nodes: MdxNode[]) {
  return nodes.some((node) => node.type !== "text" || Boolean(node.value?.trim()));
}

function trimTextEdges(nodes: MdxNode[]) {
  const trimmed = [...nodes];
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if (first?.type === "text" && first.value) {
    first.value = first.value.replace(/^\s+/, "");
  }

  if (last?.type === "text" && last.value) {
    last.value = last.value.replace(/\s+$/, "");
  }

  return trimmed.filter((node) => node.type !== "text" || Boolean(node.value));
}

function splitExploreParagraph(node: MdxNode) {
  if (node.type !== "paragraph" || !node.children?.some((child) => child.type === "text" && child.value?.includes("[>]"))) {
    return [node];
  }

  const paragraphs: MdxNode[] = [];
  let current: MdxNode[] = [];

  function finishCurrent() {
    const children = trimTextEdges(current);

    if (hasUsefulText(children)) {
      paragraphs.push({
        ...node,
        children
      });
    }

    current = [];
  }

  for (const child of node.children) {
    if (child.type !== "text" || !child.value?.includes("[>]")) {
      current.push(child);
      continue;
    }

    const pattern = /(?:^|\r?\n)\s*\[>\]\s*/g;
    let cursor = 0;
    let match;

    while ((match = pattern.exec(child.value)) !== null) {
      const before = child.value.slice(cursor, match.index);

      if (before) {
        current.push({ ...child, value: before });
      }

      finishCurrent();
      cursor = pattern.lastIndex;
    }

    const after = child.value.slice(cursor);

    if (after) {
      current.push({ ...child, value: after });
    }
  }

  finishCurrent();
  return paragraphs.length > 0 ? paragraphs : [node];
}

function normalizeExploreChildren(node: MdxNode) {
  node.children = (node.children ?? []).flatMap((child) => splitExploreParagraph(child));
}

export function remarkExplore() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "containerDirective" || node.name !== "explore") {
        return;
      }

      normalizeExploreChildren(node);

      node.data = {
        hName: "aside",
        hProperties: {
          className: "explore",
          "data-explore": "true"
        }
      };
    });
  };
}

export function remarkCallouts() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "containerDirective" || !node.name || !CALLOUTS.has(node.name)) {
        return;
      }

      const title = readDirectiveLabel(node) ?? calloutTitle(node.name);

      node.data = {
        hName: "aside",
        hProperties: {
          className: `callout callout-${node.name}`,
          "data-callout": node.name,
          "data-callout-title": title
        }
      };
    });
  };
}

export function remarkCharacterDialogues() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "containerDirective" || !node.name || !CHARACTERS.has(node.name)) {
        return;
      }

      const align = node.attributes?.align;

      node.data = {
        hName: "aside",
        hProperties: {
          className: `character-dialogue${align === "right" ? " align-right" : align === "left" ? " align-left" : ""}`,
          "data-character": node.name,
          "data-align": align === "right" || align === "left" ? align : ""
        }
      };
    });
  };
}

export function remarkEmojiCards() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "emoji") {
        return;
      }

      const rawValue = node.children?.[0]?.value?.trim() ?? node.attributes?.name ?? "";
      const emoji = EMOJI_NAMES[rawValue.toLowerCase()] ?? rawValue;
      const size = node.attributes?.size ?? "medium";
      const label = node.attributes?.label ?? node.attributes?.text ?? rawValue;
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const transliteration = node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-emoji",
        hProperties: {
          emoji,
          label,
          meaning,
          meaningTamil,
          transliteration,
          size
        }
      };
    });
  };
}

export function remarkImageWords() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || (node.name !== "imageWord" && node.name !== "svgWord")) {
        return;
      }

      const image = node.children?.[0]?.value?.trim() ?? node.attributes?.name ?? "";
      const size = node.attributes?.size ?? "huge";
      const label = node.attributes?.label ?? node.attributes?.text ?? image;
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const transliteration = node.attributes?.transliteration ?? "";
      const format = node.name === "svgWord" ? "svg" : "png";

      node.children = [];
      node.data = {
        hName: "lexora-image-word",
        hProperties: {
          image,
          format,
          label,
          meaning,
          meaningTamil,
          transliteration,
          size
        }
      };
    });
  };
}

export function remarkTextWords() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "textWord") {
        return;
      }

      const label = node.attributes?.label ?? node.attributes?.text ?? node.children?.[0]?.value?.trim() ?? "";
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const size = node.attributes?.size ?? "huge";
      const transliteration = node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-text-word",
        hProperties: {
          label,
          meaning,
          meaningTamil,
          transliteration,
          size
        }
      };
    });
  };
}

export function remarkSentenceCards() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "sentence") {
        return;
      }

      const sentence = node.children?.[0]?.value?.trim() ?? node.attributes?.text ?? "";
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const transliteration = node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-sentence",
        hProperties: {
          sentence,
          meaning,
          meaningTamil,
          transliteration
        }
      };
    });
  };
}

export function remarkImageSentences() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "imageSentence") {
        return;
      }

      const sentence = node.children?.[0]?.value?.trim() ?? node.attributes?.text ?? "";
      const boxed = node.attributes?.boxed ?? "false";
      const emoji = emojiValue(node.attributes?.emoji);
      const format = node.attributes?.format ?? "png";
      const image = node.attributes?.image ?? "";
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const size = node.attributes?.size ?? "medium";
      const transliteration = node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-image-sentence",
        hProperties: {
          emoji,
          boxed,
          format,
          image,
          meaning,
          meaningTamil,
          sentence,
          size,
          transliteration
        }
      };
    });
  };
}

export function remarkImageBlanks() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "imageBlank") {
        return;
      }

      const answer = node.children?.[0]?.value?.trim() ?? node.attributes?.answer ?? "";
      const boxed = node.attributes?.boxed ?? "false";
      const emoji = emojiValue(node.attributes?.emoji);
      const format = node.attributes?.format ?? "png";
      const image = node.attributes?.image ?? "";
      const meaning = node.attributes?.meaning ?? "";
      const meaningTamil = node.attributes?.meaningTamil ?? "";
      const size = node.attributes?.size ?? "medium";
      const template = node.attributes?.template ?? node.attributes?.sentence ?? "";
      const transliteration = node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-image-blank",
        hProperties: {
          answer,
          boxed,
          emoji,
          format,
          image,
          meaning,
          meaningTamil,
          size,
          template,
          transliteration
        }
      };
    });
  };
}

export function remarkTableCells() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "tableCell") {
        return;
      }

      const value = node.children?.[0]?.value?.trim() ?? node.attributes?.value ?? "";
      const sub = node.attributes?.sub ?? node.attributes?.meaning ?? node.attributes?.transliteration ?? "";

      node.children = [];
      node.data = {
        hName: "lexora-table-cell",
        hProperties: {
          value,
          sub
        }
      };
    });
  };
}

export function remarkLetterCards() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "letter") {
        return;
      }

      const glyph = node.children?.[0]?.value?.trim() ?? node.attributes?.glyph ?? "";
      const transliteration = node.attributes?.transliteration ?? node.attributes?.iast ?? "";
      const meaning = node.attributes?.meaning ?? "";
      const highlight = node.attributes?.highlight ?? "false";
      const size = node.attributes?.size ?? "normal";

      node.children = [];
      node.data = {
        hName: "lexora-letter",
        hProperties: {
          glyph,
          transliteration,
          meaning,
          highlight,
          size
        }
      };
    });
  };
}

export function remarkLetterGrid() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "letterGrid") {
        return;
      }

      const title = node.children?.[0]?.value?.trim() ?? node.attributes?.title ?? "";
      const items = node.attributes?.items ?? "";
      const rows = node.attributes?.rows ?? "4";
      const cols = node.attributes?.cols ?? "";
      const layout = node.attributes?.layout ?? "inline";
      const variant = node.attributes?.variant ?? "board";

      node.children = [];
      node.data = {
        hName: "lexora-letter-grid",
        hProperties: {
          title,
          items,
          rows,
          cols,
          layout,
          variant
        }
      };
    });
  };
}

function textContent(node: MdxNode): string {
  if (node.type === "text") {
    return node.value ?? "";
  }

  if (node.type === "break") {
    return "\n";
  }

  const content = (node.children ?? []).map((child) => textContent(child)).join("");

  return node.type === "paragraph" ? `${content}\n` : content;
}

export function remarkVocabularyGrid() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "containerDirective" || node.name !== "vocabGrid") {
        return;
      }

      const title = node.attributes?.title ?? "";
      const cols = node.attributes?.cols ?? "4";
      const items = textContent(node).trim();

      node.children = [];
      node.data = {
        hName: "lexora-vocab-grid",
        hProperties: {
          title,
          cols,
          items
        }
      };
    });
  };
}

export function remarkArticleImages() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || (node.name !== "bigImage" && node.name !== "bigSvg")) {
        return;
      }

      const image = node.children?.[0]?.value?.trim() ?? node.attributes?.name ?? "";
      const format = node.name === "bigSvg" ? "svg" : "png";

      node.children = [];
      node.data = {
        hName: "lexora-article-image",
        hProperties: {
          align: node.attributes?.align ?? "center",
          alt: node.attributes?.alt ?? node.attributes?.caption ?? image,
          bordered: node.attributes?.bordered ?? "false",
          caption: node.attributes?.caption ?? "",
          fit: node.attributes?.fit ?? "contain",
          format,
          height: node.attributes?.height ?? "",
          image,
          loading: node.attributes?.loading ?? "lazy",
          rounded: node.attributes?.rounded ?? "false",
          shadow: node.attributes?.shadow ?? "false",
          width: node.attributes?.width ?? ""
        }
      };
    });
  };
}

export function remarkIcons() {
  return (tree: MdxNode) => {
    visit(tree, (node: MdxNode) => {
      if (node.type !== "textDirective" || node.name !== "icon") {
        return;
      }

      const iconName = node.children?.[0]?.value ?? node.attributes?.name ?? "Sparkles";

      node.children = [];
      node.data = {
        hName: "lexora-icon",
        hProperties: {
          name: iconName
        }
      };
    });
  };
}

export function remarkRevealBlanks() {
  return (tree: MdxNode) => {
    visit(tree, "text", (node: MdxNode, index: number | undefined, parent: Parent) => {
      if (typeof index !== "number" || !parent || !node.value?.includes("[[")) {
        return;
      }

      const pieces = [];
      const pattern = /\[\[([^\]]+)\]\]/g;
      let cursor = 0;
      let match;

      while ((match = pattern.exec(node.value)) !== null) {
        if (match.index > cursor) {
          pieces.push({
            type: "text",
            value: node.value.slice(cursor, match.index)
          });
        }

        const reveal = revealParts(match[1]);

        pieces.push({
          type: "html",
          value: `<lexora-blank answer="${escapeHtml(reveal.answer)}" prefix="${escapeHtml(reveal.prefix)}" suffix="${escapeHtml(reveal.suffix)}"></lexora-blank>`
        });

        cursor = match.index + match[0].length;
      }

      if (cursor < node.value.length) {
        pieces.push({
          type: "text",
          value: node.value.slice(cursor)
        });
      }

      parent.children.splice(index, 1, ...pieces);
    });
  };
}
