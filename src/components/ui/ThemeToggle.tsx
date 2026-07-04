"use client";

import styles from "@/components/ui/ThemeToggle.module.css";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = localStorage.getItem("lexora-theme");

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      window.addEventListener("lexora-theme-change", callback);

      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("lexora-theme-change", callback);
      };
    },
    getPreferredTheme,
    () => "light"
  );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("lexora-theme", nextTheme);
    window.dispatchEvent(new Event("lexora-theme-change"));
  }

  return (
    <button
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={styles.toggle}
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      suppressHydrationWarning
    >
      {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
