import { visit } from "unist-util-visit";
import type { Node, Parent } from "unist";

const CALLOUTS = new Set(["note", "tip", "info", "caution", "warning", "danger"]);

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
