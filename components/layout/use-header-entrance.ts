"use client";

import { useLayoutEffect, useRef } from "react";
import { createHeaderEntranceTracker } from "@/lib/header-entrance";

// Keep the intro consumed across section remounts, until a full page reload.
const claimEntrance = createHeaderEntranceTracker();

export function useHeaderEntrance(pathname: string, homePath: string) {
  const headerRef = useRef<HTMLElement>(null);
  const claimedThisVisit = useRef(false);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    if (pathname !== homePath) {
      claimedThisVisit.current = false;
      delete header.dataset.headerIntro;
      return;
    }

    // Retain the claim through React's development effect replay.
    if (!claimedThisVisit.current) {
      claimedThisVisit.current = claimEntrance(pathname, homePath);
    }
    if (claimedThisVisit.current) {
      header.dataset.headerIntro = "true";
    } else {
      delete header.dataset.headerIntro;
    }
  }, [pathname, homePath]);

  return headerRef;
}
