"use client";

import * as React from "react";
import { SkeletonCalendar } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const CalendarioClient = React.lazy(() =>
  import("./calendario-client").then((m) => ({ default: m.CalendarioClient })),
);

function CalendarioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3 w-72 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <SkeletonCalendar />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <React.Suspense fallback={<CalendarioSkeleton />}>
      <CalendarioClient />
    </React.Suspense>
  );
}
