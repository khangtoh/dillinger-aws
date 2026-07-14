"use client";

import { useCallback } from "react";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { SAME_ORIGIN_JSON_HEADERS } from "@/lib/client-request";

export type ExportFormat = "markdown" | "html" | "pdf";

function getDownloadFilename(response: Response, fallback: string): string {
  const contentDisposition = response.headers.get("Content-Disposition");
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export function useExport() {
  const currentDocument = useStore((state) => state.currentDocument);
  const { notify } = useToast();

  const handleExport = useCallback(
    async (format: ExportFormat, options?: { styled?: boolean }) => {
      if (!currentDocument) return;

      const formatLabel =
        format === "html" && options?.styled ? "styled HTML" : format.toUpperCase();

      try {
        notify(`Preparing ${formatLabel}...`);

        const response = await fetch(`/api/export/${format}`, {
          method: "POST",
          headers: SAME_ORIGIN_JSON_HEADERS,
          body: JSON.stringify({
            markdown: currentDocument.body,
            title: currentDocument.title,
            styled: options?.styled,
          }),
        });

        if (!response.ok) throw new Error("Export failed");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getDownloadFilename(
          response,
          `${currentDocument.title}.${format === "markdown" ? "md" : format}`
        );
        a.click();
        URL.revokeObjectURL(url);

        notify(
          format === "html" && options?.styled === true
            ? "Exported as styled HTML"
            : `Exported as ${format.toUpperCase()}`
        );
      } catch (error) {
        if (error instanceof TypeError) {
          notify(`${formatLabel} export failed — check your connection`);
        } else {
          notify(`${formatLabel} export failed — please try again`);
        }
      }
    },
    [currentDocument, notify]
  );

  return { handleExport };
}
