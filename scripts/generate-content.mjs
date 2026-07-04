import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content");
const generatedDir = path.join(rootDir, "src", "generated");
const publicDir = path.join(rootDir, "public");

function normalizeBasePath(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function normalizeSiteUrl(value) {
  const fallback = "https://lexora.pages.dev";
  const trimmed = value?.trim() || fallback;

  return trimmed.replace(/\/+$/g, "");
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/:::\w+/g, " ")
    .replace(/:::/g, " ")
    .replace(/:\w+\[([^\]]+)\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
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

  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!item) {
      continue;
    }

    const [, key, rawValue] = item;
    const trimmed = rawValue.trim();
    const quoted = trimmed.match(/^["'](.*)["']$/);
    const numeric = Number(trimmed);

    data[key] = quoted ? quoted[1] : Number.isFinite(numeric) && trimmed !== "" ? numeric : trimmed;
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
  const explicitPage = config.pages?.find((page) => page.slug === slug);

  if (typeof explicitPage?.order === "number") {
    return explicitPage.order;
  }

  if (typeof frontmatterOrder === "number") {
    return frontmatterOrder;
  }

  const orderedIndex = config.order?.indexOf(slug);

  return orderedIndex >= 0 ? orderedIndex + 1 : index + 100;
}

async function build() {
  const languages = [];
  const docsContent = {};
  const searchIndex = [];
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
        toc: extractToc(body)
      };

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
            stripMarkdown(body)
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

  await writeFile(
    path.join(generatedDir, "content-index.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type PageMeta = {\n  slug: string;\n  title: string;\n  description: string;\n  order: number;\n};\n\nexport type LanguageConfig = {\n  slug: string;\n  title: string;\n  nativeName: string;\n  description: string;\n  locale: string;\n  pages: readonly PageMeta[];\n};\n\nexport const languages = ${JSON.stringify(languages, null, 2)} as const satisfies readonly LanguageConfig[];\n\nexport function getLanguageConfig(language: string) {\n  return languages.find((item) => item.slug === language);\n}\n\nexport function getDocMeta(language: string, slug: string) {\n  return getLanguageConfig(language)?.pages.find((page) => page.slug === slug);\n}\n\nexport function getFirstDocPath() {\n  const language = languages[0];\n  const page = language?.pages[0];\n\n  if (!language || !page) {\n    return \"/\";\n  }\n\n  return \`/docs/\${language.slug}/\${page.slug}\`;\n}\n\nexport function getPreviousNext(language: string, slug: string) {\n  const pages = getLanguageConfig(language)?.pages ?? [];\n  const index = pages.findIndex((page) => page.slug === slug);\n\n  return {\n    previous: index > 0 ? pages[index - 1] : undefined,\n    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined\n  };\n}\n`
  );

  await writeFile(
    path.join(generatedDir, "content.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type TocItem = {\n  id: string;\n  text: string;\n  depth: number;\n};\n\nexport type DocContent = {\n  title: string;\n  description: string;\n  body: string;\n  toc: readonly TocItem[];\n};\n\nexport const docsContent = ${JSON.stringify(docsContent, null, 2)} as const;\n\nexport function getGeneratedDoc(language: string, slug: string): DocContent | undefined {\n  return (docsContent as unknown as Record<string, Record<string, DocContent>>)[language]?.[slug];\n}\n`
  );

  await writeFile(
    path.join(generatedDir, "search-index.generated.ts"),
    `/* eslint-disable */\n// Generated by scripts/generate-content.mjs. Do not edit manually.\n\nexport type SearchIndexItem = {\n  id: string;\n  language: string;\n  languageTitle: string;\n  languageNativeName: string;\n  slug: string;\n  path: string;\n  title: string;\n  description: string;\n  headings: readonly string[];\n  content: string;\n  searchText: string;\n};\n\nexport const searchIndex = ${JSON.stringify(searchIndex, null, 2)} as const satisfies readonly SearchIndexItem[];\n`
  );

  await writeFile(
    path.join(publicDir, "search-index.json"),
    `${JSON.stringify(
      {
        version: 1,
        generator: "lexora",
        documents: searchIndex
      },
      null,
      2
    )}\n`
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
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueSitemapPaths
    .map((item) => {
      const normalizedPath = item === "/" ? "/" : `${item.replace(/\/+$/g, "")}/`;
      const url = `${siteUrl}${basePath}${normalizedPath}`.replace(/([^:]\/)\/+/g, "$1");

      return `  <url>\n    <loc>${url}</loc>\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;

  await writeFile(path.join(publicDir, "sitemap.xml"), sitemap);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
