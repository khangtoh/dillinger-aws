"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-control bg-control-track",
        className
      )}
    />
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas" aria-label="Loading editor">
      <aside className="hidden h-dvh w-sidebar shrink-0 flex-col border-r border-border-subtle bg-surface p-4 sm:flex">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="size-9 rounded-panel" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <Skeleton className="mb-3 h-2.5 w-20" />
        <div className="space-y-2 rounded-panel border border-border-subtle p-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-5/6" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="mb-3 mt-7 h-2.5 w-24" />
        <div className="space-y-3 px-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mt-auto h-10 w-full rounded-panel" />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-14 items-center gap-3 border-b border-border-subtle bg-surface px-3 sm:px-5">
          <Skeleton className="size-9 sm:hidden" />
          <Skeleton className="h-5 w-28 sm:hidden" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="size-9" />
        </div>

        <div className="border-b border-border-subtle bg-canvas px-3 py-3 sm:px-5">
          <Skeleton className="h-6 w-52 max-w-full" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>

        <div className="m-2 flex min-h-0 flex-1 overflow-hidden rounded-panel border border-border-subtle bg-surface shadow-medium sm:m-3">
          <div className="w-full space-y-3 p-4 sm:w-1/2 sm:border-r sm:border-border-subtle">
            <Skeleton className="mb-5 h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="hidden w-1/2 space-y-4 p-5 sm:block">
            <Skeleton className="mb-6 h-3 w-16" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
