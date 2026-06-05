"use client";

import * as React from "react";
import { QueryProvider } from "@/components/query-provider";
import { TopProgress } from "@/components/top-progress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <React.Suspense fallback={null}>
        <TopProgress />
      </React.Suspense>
      {children}
    </QueryProvider>
  );
}
