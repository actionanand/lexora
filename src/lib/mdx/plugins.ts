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
