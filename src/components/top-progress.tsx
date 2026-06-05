"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({
  minimum: 0.18,
  easing: "ease",
  speed: 380,
  trickleSpeed: 120,
  showSpinner: false,
});

export function TopProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    NProgress.start();
    const t = window.setTimeout(() => NProgress.done(), 200);
    return () => {
      window.clearTimeout(t);
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
