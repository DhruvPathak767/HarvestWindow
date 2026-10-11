import React from "react";

export function YieldSkeleton() {
  return (
    <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-muted rounded-md" />
          <div className="h-4 w-36 bg-muted/60 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-muted rounded-full" />
          <div className="h-7 w-20 bg-muted rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted/80 rounded" />
            <div className="h-3 w-32 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      <div className="h-16 w-full bg-muted/30 rounded-xl" />
    </div>
  );
}
