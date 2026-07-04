"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { SiteSearch } from "@/components/search/SiteSearch";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { LanguageConfig } from "@/generated/content-index.generated";
import { withBasePath } from "@/lib/base-path";
import styles from "@/app/page.module.css";
import { ArrowRight, Brain, Globe2, LogOut, Map, Sparkles } from "lucide-react";
import Image from "next/image";

export function LandingPageClient({
  firstDocPath,
  languages
}: {
  firstDocPath: string;
  languages: readonly LanguageConfig[];
}) {
  const { logout, status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const heroLabel = isAuthenticated ? "Continue learning" : "Login to learn";

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <a className={styles.brand} href={withBasePath("/")}>
          <Image
            className={styles.brandLogo}
            src={withBasePath("/images/lexora.png")}
            width={38}
            height={38}
            alt=""
            priority
          />
          <span>Lexora</span>
        </a>
        <div className={styles.navActions}>
          <ThemeToggle />
          {isAuthenticated ? (
            <button className={styles.logoutButton} type="button" onClick={() => logout()}>
              <LogOut size={17} aria-hidden />
              Logout
            </button>
          ) : (
            <ButtonLink href={firstDocPath} variant="secondary">
              Login
            </ButtonLink>
          )}
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <Globe2 size={18} aria-hidden />
            Multilingual learning docs
          </div>
          <h1>Lexora</h1>
          <p>
            A calm documentation space for learning languages through lessons, grammar notes,
            vocabulary, diagrams, and interactive reveal practice.
          </p>
          {isAuthenticated ? (
            <div className={styles.heroSearch}>
              <SiteSearch hero />
            </div>
          ) : null}
          <div className={styles.heroActions}>
            <ButtonLink href={firstDocPath}>
              {heroLabel} <ArrowRight size={18} aria-hidden />
            </ButtonLink>
            <ButtonLink href="#languages" variant="secondary">
              View languages
            </ButtonLink>
          </div>
        </div>
        <div className={styles.heroMedia} aria-hidden>
          <Image
            className={styles.heroImage}
            src={withBasePath("/images/lexora.png")}
            width={430}
            height={430}
            alt=""
            priority
          />
        </div>
      </section>

      <section className={styles.featureBand} aria-label="Highlights">
        <article>
          <Sparkles size={22} aria-hidden />
          <h2>Many tongues, one rhythm</h2>
          <p>
            Begin with Sanskrit and Kannada, then wander into Tamil, Hindi, French, and more as new
            lessons arrive.
          </p>
        </article>
        <article>
          <Brain size={22} aria-hidden />
          <h2>Practice that answers back</h2>
          <p>
            Reveal blanks, quick checks, and compact examples help you remember words instead of
            only reading them.
          </p>
        </article>
        <article>
          <Map size={22} aria-hidden />
          <h2>Grammar with landmarks</h2>
          <p>
            Callouts and diagrams make sentence patterns easier to notice before you try them
            yourself.
          </p>
        </article>
      </section>

      <section className={styles.languages} id="languages">
        <div>
          <span className={styles.sectionLabel}>Languages</span>
          <h2>Pick a language, build a habit, return sharper each day.</h2>
        </div>
        <div className={styles.languageGrid}>
          {languages.map((language) => (
            <ButtonLink
              key={language.slug}
              className={styles.languageCard}
              href={`/docs/${language.slug}`}
              variant="secondary"
            >
              <span>{language.title}</span>
              <small>{language.nativeName}</small>
            </ButtonLink>
          ))}
        </div>
      </section>
    </main>
  );
}
