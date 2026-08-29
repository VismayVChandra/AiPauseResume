"use client";

import { useEffect, useRef } from "react";

export interface GamePalette {
  ink: string;
  brand: string;
  muted: string;
  paper: string;
  line: string;
}

const FALLBACK: GamePalette = {
  ink: "#1f2937",
  brand: "#0f766e",
  muted: "#9ca3af",
  paper: "#ffffff",
  line: "#d1d5db",
};

function readPalette(): GamePalette {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--foreground", FALLBACK.ink),
    brand: read("--brand", FALLBACK.brand),
    muted: read("--muted-foreground", FALLBACK.muted),
    paper: read("--paper", FALLBACK.paper),
    line: read("--border", FALLBACK.line),
  };
}

/**
 * Every landing-page canvas game reads the app's real CSS custom
 * properties for its draw palette instead of hardcoding a second colour
 * set. That was a one-time read on mount, which was fine right up until
 * the dark-mode toggle: a game already mounted kept drawing with
 * whatever palette was live when it mounted, even after the page's theme
 * changed underneath it. A MutationObserver on the data-theme attribute
 * (the one thing the toggle actually flips) re-reads the palette exactly
 * when it changes, with no per-frame cost the rest of the time.
 */
export function useGamePalette() {
  const paletteRef = useRef<GamePalette>(FALLBACK);

  useEffect(() => {
    paletteRef.current = readPalette();
    const observer = new MutationObserver(() => {
      paletteRef.current = readPalette();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return paletteRef;
}
