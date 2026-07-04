import { DocRouteClient } from "@/components/docs/DocRouteClient";
import { DocsIndexRoute } from "@/components/docs/DocsIndexRoute";
import { LanguageIndexRoute } from "@/components/docs/LanguageIndexRoute";
import { getDocMeta, getLanguageConfig, languages } from "@/generated/content-index.generated";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type DocsRouteParams = {
  parts?: string[];
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    {
      parts: []
    },
    ...languages.map((language) => ({
      parts: [language.slug]
    })),
    ...languages.flatMap((language) =>
      language.pages.map((page) => ({
        parts: [language.slug, page.slug]
      }))
    )
  ];
}

export async function generateMetadata({
  params
}: {
  params: Promise<DocsRouteParams>;
}): Promise<Metadata> {
  const { parts = [] } = await params;
  const [language, slug] = parts;

  if (!language) {
    return {
      title: "Lessons"
    };
  }

  const languageConfig = getLanguageConfig(language);

  if (!slug) {
    return {
      title: languageConfig ? languageConfig.title : "Lessons",
      description: languageConfig?.description
    };
  }

  const page = getDocMeta(language, slug);

  return {
    title: page ? `${page.title} - ${languageConfig?.title ?? "Lessons"}` : "Lessons",
    description: page?.description
  };
}

export default async function DocsRoute({ params }: { params: Promise<DocsRouteParams> }) {
  const { parts = [] } = await params;

  if (parts.length === 0) {
    return <DocsIndexRoute />;
  }

  if (parts.length === 1) {
    const language = parts[0];

    if (!language || !getLanguageConfig(language)) {
      notFound();
    }

    return <LanguageIndexRoute language={language} />;
  }

  if (parts.length === 2) {
    const language = parts[0];
    const slug = parts[1];

    if (!language || !slug || !getDocMeta(language, slug)) {
      notFound();
    }

    return <DocRouteClient language={language} slug={slug} />;
  }

  notFound();
}
