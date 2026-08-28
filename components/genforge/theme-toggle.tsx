"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "pauseresume_theme";

// A plain binary toggle, not a light/dark/system picker — matches what
// was actually asked for. The FOUC-prevention script in app/layout.tsx
// always resolves data-theme to an explicit "light" or "dark" before
// first paint (stored choice, else system preference), so this component
// just needs to read that same resolved value on mount and flip it.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // storage blocked — the toggle still works for this page load, just
      // won't be remembered next visit
    }
  }

  // Avoids a hydration mismatch: the server has no way to know the
  // client's stored/system preference, so it always renders this as
  // false until mount — a same-sized placeholder keeps the header from
  // jumping once the real icon appears.
  if (!mounted) {
    return <span className="h-8 w-8 shrink-0" aria-hidden />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
