"use client";

import Link from "next/link";
import { User as UserIcon } from "lucide-react";

// Header-corner entry point into the dedicated /sign-in page. Entirely
// optional — the whole app works for guests without ever touching this.
export function HeaderAuth() {
  return (
    <Link
      href="/sign-in"
      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
    >
      <UserIcon className="h-3.5 w-3.5" />
      Sign in / Sign up
    </Link>
  );
}
