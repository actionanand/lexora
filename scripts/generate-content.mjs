import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content");
const generatedDir = path.join(rootDir, "src", "generated");
const publicDir = path.join(rootDir, "public");
const dataImageDirs = {
  png: [{ dir: path.join(rootDir, "src", "app", "dataImg", "png"), importBase: "@/app/dataImg/png" }],
  svg: [{ dir: path.join(rootDir, "src", "app", "dataImg", "svg"), importBase: "@/app/dataImg/svg" }]
};
const bigDataImageDirs = {
  png: [
    { dir: path.join(rootDir, "src", "app", "bigDataImg", "png"), importBase: "@/app/bigDataImg/png" },
    { dir: path.join(rootDir, "src", "app", "dataImg", "png"), importBase: "@/app/dataImg/png" }
  ],
  svg: [
    { dir: path.join(rootDir, "src", "app", "bigDataImg", "svg"), importBase: "@/app/bigDataImg/svg" },
    { dir: path.join(rootDir, "src", "app", "dataImg", "svg"), importBase: "@/app/dataImg/svg" }
  ]
};

function normalizeBasePath(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function normalizeSiteUrl(value) {
  const fallback = "https://ar-lexora.pages.dev";
  const trimmed = value?.trim() || fallback;

  return trimmed.replace(/\/+$/g, "");
}

function revealText(value) {
  const separatorIndex = value.indexOf("|");

  if (separatorIndex === -1) {
    return value;
  }

  const answer = value.slice(0, separatorIndex).trim();
  const template = value.slice(separatorIndex + 1);
  const blankPattern = /_{3,}/;

  if (blankPattern.test(template)) {
    return template.replace(blankPattern, answer);
  }

  return `${template} ${answer}`;
}

function highlightText(value) {
  return value.split("|")[0].trim();
}

function stripHighlightSyntax(value) {
  return value.replace(/==(.+?)==/g, (_, inner) => highlightText(inner));
}

function normalizeImageWordKey(value) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toLowerCase();
}

function extractImageWordNames(markdown) {
  const names = new Set();
  const pattern = /:(imageWord|svgWord)\[([^\]]+)\]/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const [, directive, name] = match;
    const format = directive === "svgWord" ? "svg" : "png";
    const imageName = normalizeImageWordKey(name);

    names.add(`${format}:${imageName}`);
  }

  return names;
}

function extractArticleImageNames(markdown) {
  const names = new Set();
  const pattern = /:(bigImage|bigSvg)\[([^\]]+)\]/g;
  let match;

  while ((match = pattern.exec(markdown)) !== null) {
    const [, directive, name] = match;
    const format = directive === "bigSvg" ? "svg" : "png";
    const imageName = normalizeImageWordKey(name);

    names.add(`${format}:${imageName}`);
  }

  return names;
}

function modulePathFromExport(value) {
  return value.endsWith(".ts") ? value : `${value}.ts`;
}

function moduleImportFromExport(value) {
  return value.replace(/^\.\//, "").replace(/\.ts$/, "");
}

async function readDataImageExportRefsFromDir(format, dataImageSource, usedNames) {
  const sources = {};
  let indexSource = "";

  try {
    indexSource = await readFile(path.join(dataImageSource.dir, "index.ts"), "utf8");
  } catch {
    return sources;
  }

  const exportPaths = new Set();
  const starExportPattern = /export\s+\*\s+from\s+["'](.+?)["'];?/g;
  const namedExportPattern = /export\s+\{[^}]+\}\s+from\s+["'](.+?)["'];?/g;
  let exportMatch;

  while ((exportMatch = starExportPattern.exec(indexSource)) !== null) {
    exportPaths.add(modulePathFromExport(exportMatch[1]));
  }

  while ((exportMatch = namedExportPattern.exec(indexSource)) !== null) {
    exportPaths.add(modulePathFromExport(exportMatch[1]));
  }

  for (const exportPath of exportPaths) {
    const source = await readFile(path.join(dataImageSource.dir, exportPath), "utf8");
    const constPattern = /export\s+const\s+([A-Za-z0-9_]+)\s*=/g;
    let constMatch;

    while ((constMatch = constPattern.exec(source)) !== null) {
      const [, exportName] = constMatch;
      const normalized = normalizeImageWordKey(exportName);
      const formatted = `${format}:${normalized}`;

      if (usedNames.has(formatted)) {
        sources[formatted] = {
          exportName,
          modulePath: `${dataImageSource.importBase}/${moduleImportFromExport(exportPath)}`
        };
      }
    }
  }

  return sources;
}

async function readDataImageExportRefs(usedNames) {
  const sources = {};

  for (const dataImageSource of dataImageDirs.png) {
    for (const [key, value] of Object.entries(await readDataImageExportRefsFromDir("png", dataImageSource, usedNames))) {
      sources[key] ??= value;
    }
  }

  for (const dataImageSource of dataImageDirs.svg) {
    for (const [key, value] of Object.entries(await readDataImageExportRefsFromDir("svg", dataImageSource, usedNames))) {
      sources[key] ??= value;
    }
  }

  return sources;
}

async function readArticleImageExportRefs(usedNames) {
  const sources = {};

  for (const dataImageSource of bigDataImageDirs.png) {
    for (const [key, value] of Object.entries(await readDataImageExportRefsFromDir("png", dataImageSource, usedNames))) {
      sources[key] ??= value;
    }
  }

  for (const dataImageSource of bigDataImageDirs.svg) {
    for (const [key, value] of Object.entries(await readDataImageExportRefsFromDir("svg", dataImageSource, usedNames))) {
      sources[key] ??= value;
    }
  }

  return sources;
}

function serializeImageSourceRegistry(exportName, sources) {
  const entries = Object.entries(sources).sort(([left], [right]) => left.localeCompare(right));
  const imports = entries.map(
    ([, source], index) =>
      `import { ${source.exportName} as ${exportName}_${index} } from "${source.modulePath}";`
  );
  const registry = entries.map(([key], index) => `  ${JSON.stringify(key)}: ${exportName}_${index}`);

  return `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\n${imports.join("\n")}${imports.length ? "\n\n" : ""}export const ${exportName} = {\n${registry.join(",\n")}\n} as const;\n`;
}

function directiveText(name, value, attributes = "") {
  const alt = /alt="([^"]+)"/.exec(attributes)?.[1];
  const caption = /caption="([^"]+)"/.exec(attributes)?.[1];
  const label = /label="([^"]+)"/.exec(attributes)?.[1];
  const meaning = /meaning="([^"]+)"/.exec(attributes)?.[1];
  const meaningTamil = /meaningTamil="([^"]+)"/.exec(attributes)?.[1];
  const transliteration = /transliteration="([^"]+)"/.exec(attributes)?.[1];

  if (name === "bigImage" || name === "bigSvg") {
    return [alt, caption].filter(Boolean).join(" ");
  }

  if (
    name === "emoji" ||
    name === "imageWord" ||
    name === "svgWord" ||
    name === "textWord" ||
    name === "sentence"
  ) {
    return [stripHighlightSyntax(value), label, transliteration, meaning, meaningTamil]
      .filter(Boolean)
      .join(" ");
  }

  return value;
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/:::\w+/g, " ")
    .replace(/:::/g, " ")
    .replace(/:(\w+)\[([^\]]+)\](\{[^}]+\})?/g, (_, name, value, attributes = "") =>
      directiveText(name, value, attributes)
    )
    .replace(/\[\[([^\]]+)\]\]/g, (_, value) => revealText(value))
    .replace(/==(.+?)==/g, (_, value) => highlightText(value))
    .replace(/\|/g, " ")
    .replace(/[#*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return { data: {}, body: source };
  }

  const data = {};

  const lines = match[1].split(/\r?\n/);

  function parseScalar(value) {
    const trimmed = value.trim();
    const quoted = trimmed.match(/^["'](.*)["']$/);
    const numeric = Number(trimmed);

    if (quoted) {
      return quoted[1];
    }

    if (trimmed === "true") {
      return true;
    }

    if (trimmed === "false") {
      return false;
    }

    return Number.isFinite(numeric) && trimmed !== "" ? numeric : trimmed;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!item) {
      continue;
    }

    const [, key, rawValue] = item;

    if (rawValue.trim() === "") {
      const values = [];

      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1];
        const listItem = nextLine.match(/^\s{2}-\s+([A-Za-z0-9_-]+):\s*(.*)$/);

        if (!listItem) {
          break;
        }

        const value = {};
        const [, firstKey, firstValue] = listItem;
        value[firstKey] = parseScalar(firstValue);
        index += 1;

        while (index + 1 < lines.length) {
          const propertyLine = lines[index + 1];
          const property = propertyLine.match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*)$/);

          if (!property) {
            break;
          }

          const [, propertyKey, propertyValue] = property;
          value[propertyKey] = parseScalar(propertyValue);
          index += 1;
        }

        values.push(value);
      }

      data[key] = values;
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, body: source.slice(match[0].length).trim() };
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractToc(markdown) {
  const toc = [];
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);

    if (!heading) {
      continue;
    }

    const depth = heading[1].length;
    const text = heading[2].replace(/[#*_`:[\]]/g, "").trim();

    toc.push({
      id: slugify(text),
      text,
      depth
    });
  }

  return toc;
}

function pageOrder(config, slug, frontmatterOrder, index) {
  if (typeof frontmatterOrder === "number") {
    return frontmatterOrder;
  }

  const explicitPage = config.pages?.find((page) => page.slug === slug);

  if (typeof explicitPage?.order === "number") {
    return explicitPage.order;
  }

  const orderedIndex = config.order?.indexOf(slug);

  return orderedIndex >= 0 ? orderedIndex + 1 : index + 100;
}

async function build() {
  const languages = [];
  const docsContent = {};
  const searchIndex = [];
  const usedImageWords = new Set();
  const usedArticleImages = new Set();
  const languageDirs = await readdir(contentDir, { withFileTypes: true });

  for (const dirent of languageDirs.filter((item) => item.isDirectory())) {
    const language = dirent.name;
    const languageDir = path.join(contentDir, language);
    const config = JSON.parse(await readFile(path.join(languageDir, "_config.json"), "utf8"));
    const files = (await readdir(languageDir)).filter((file) => file.endsWith(".mdx")).sort();
    const pages = [];

    docsContent[language] = {};

    for (const [index, file] of files.entries()) {
      const slug = file.replace(/\.mdx$/, "");
      const source = await readFile(path.join(languageDir, file), "utf8");
      const { data, body } = parseFrontmatter(source);
      const configuredPage = config.pages?.find((page) => page.slug === slug) ?? {};
      const title = data.title ?? configuredPage.title ?? titleFromSlug(slug);
      const description = data.description ?? configuredPage.description ?? "";
      const order = pageOrder(config, slug, data.order, index);

      for (const imageWordName of extractImageWordNames(body)) {
        usedImageWords.add(imageWordName);
      }

      for (const articleImageName of extractArticleImageNames(body)) {
        usedArticleImages.add(articleImageName);
      }

      pages.push({
        slug,
        title,
        description,
        order
      });

      docsContent[language][slug] = {
        title,
        description,
        body,
        toc: extractToc(body),
        mediaEmbeds: Array.isArray(data.mediaEmbeds) ? data.mediaEmbeds : []
      };

      const mediaEmbedText = Array.isArray(data.mediaEmbeds)
        ? data.mediaEmbeds
            .map((item) => [item.title, item.type].filter(Boolean).join(" "))
            .join(" ")
        : "";

      searchIndex.push({
        id: `${language}/${slug}`,
        language,
        languageTitle: config.title,
        languageNativeName: config.nativeName,
        slug,
        path: `/docs/${language}/${slug}`,
        title,
        description,
        headings: extractToc(body).map((item) => item.text),
        content: stripMarkdown(body),
        searchText: normalizeSearchText(
          [
            config.title,
            config.nativeName,
            language,
            slug,
            title,
            description,
            extractToc(body)
              .map((item) => item.text)
              .join(" "),
            stripMarkdown(body),
            mediaEmbedText
          ].join(" ")
        )
      });
    }

    pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

    languages.push({
      slug: language,
      title: config.title,
      nativeName: config.nativeName,
      description: config.description,
      locale: config.locale,
      pages
    });
  }

  languages.sort((a, b) => a.title.localeCompare(b.title));

  await mkdir(generatedDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const imageWordSources = await readDataImageExportRefs(usedImageWords);
  const articleImageSources = await readArticleImageExportRefs(usedArticleImages);

  await writeFile(
    path.join(generatedDir, "content-index.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type PageMeta = {\n  slug: string;\n  title: string;\n  description: string;\n  order: number;\n};\n\nexport type LanguageConfig = {\n  slug: string;\n  title: string;\n  nativeName: string;\n  description: string;\n  locale: string;\n  pages: readonly PageMeta[];\n};\n\nexport const languages = ${JSON.stringify(languages, null, 2)} as const satisfies readonly LanguageConfig[];\n\nexport function getLanguageConfig(language: string) {\n  return languages.find((item) => item.slug === language);\n}\n\nexport function getDocMeta(language: string, slug: string) {\n  return getLanguageConfig(language)?.pages.find((page) => page.slug === slug);\n}\n\nexport function getFirstDocPath() {\n  const language = languages[0];\n  const page = language?.pages[0];\n\n  if (!language || !page) {\n    return \"/\";\n  }\n\n  return \`/docs/\${language.slug}/\${page.slug}\`;\n}\n\nexport function getPreviousNext(language: string, slug: string) {\n  const pages = getLanguageConfig(language)?.pages ?? [];\n  const index = pages.findIndex((page) => page.slug === slug);\n\n  return {\n    previous: index > 0 ? pages[index - 1] : undefined,\n    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined\n  };\n}\n`
  );

  await writeFile(
    path.join(generatedDir, "content.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type TocItem = {\n  id: string;\n  text: string;\n  depth: number;\n};\n\nexport type MediaEmbed = {\n  type: string;\n  id?: string;\n  url?: string;\n  title?: string;\n  startTime?: number;\n};\n\nexport type DocContent = {\n  title: string;\n  description: string;\n  body: string;\n  toc: readonly TocItem[];\n  mediaEmbeds: readonly MediaEmbed[];\n};\n\nexport const docsContent = ${JSON.stringify(docsContent, null, 2)} as const;\n\nexport function getGeneratedDoc(language: string, slug: string): DocContent | undefined {\n  return (docsContent as unknown as Record<string, Record<string, DocContent>>)[language]?.[slug];\n}\n`
  );

  await writeFile(
    path.join(generatedDir, "search-index.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type SearchIndexItem = {\n  id: string;\n  language: string;\n  languageTitle: string;\n  languageNativeName: string;\n  slug: string;\n  path: string;\n  title: string;\n  description: string;\n  headings: readonly string[];\n  content: string;\n  searchText: string;\n};\n\nexport const searchIndex = ${JSON.stringify(searchIndex, null, 2)} as const satisfies readonly SearchIndexItem[];\n`
  );

  await writeFile(
    path.join(generatedDir, "image-word-sources.generated.ts"),
    serializeImageSourceRegistry("imageWordSources", imageWordSources)
  );

  await writeFile(
    path.join(generatedDir, "article-image-sources.generated.ts"),
    serializeImageSourceRegistry("articleImageSources", articleImageSources)
  );

  await writeFile(
    path.join(publicDir, "search-index.json"),
    JSON.stringify({
      version: 1,
      generator: "lexora",
      documents: searchIndex
    })
  );

  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const sitemapPaths = [
    "/",
    "/docs",
    ...languages.map((language) => `/docs/${language.slug}`),
    ...searchIndex.map((item) => item.path)
  ];
  const uniqueSitemapPaths = [...new Set(sitemapPaths)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueSitemapPaths
    .map((item) => {
      const normalizedPath = item === "/" ? "/" : `${item.replace(/\/+$/g, "")}/`;
      const url = `${siteUrl}${basePath}${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");

      return `<url><loc>${url}</loc></url>`;
    })
    .join("")}</urlset>`;

  await writeFile(path.join(publicDir, "sitemap.xml"), sitemap);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
