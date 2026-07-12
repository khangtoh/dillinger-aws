"use client";

import nextDynamic from "next/dynamic";
import { EditorSkeleton } from "@/components/ui/Skeleton";

export const Editor = nextDynamic(
  () => import("@/components/editor/EditorContainer").then((mod) => mod.EditorContainer),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);
