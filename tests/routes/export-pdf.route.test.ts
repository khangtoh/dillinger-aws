// @vitest-environment node

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pdf", () => ({
  renderPdfBuffer: vi.fn(),
}));

import { POST as exportPdf } from "@/app/api/export/pdf/route";
import { renderPdfBuffer } from "@/lib/pdf";

const renderPdfBufferMock = vi.mocked(renderPdfBuffer);
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

function pdfRequest(body: unknown) {
  return new Request("http://localhost:3000/api/export/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
      "X-Dillinger-Request": "same-origin",
    },
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/export/pdf", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects missing markdown", async () => {
    const response = await exportPdf(
      pdfRequest({})
    );

    expect(response.status).toBe(400);
  });

  it("returns a PDF attachment with a stable filename", async () => {
    renderPdfBufferMock.mockResolvedValue(Buffer.from("%PDF-1.4"));

    const response = await exportPdf(
      pdfRequest({ markdown: "# Exported", title: "Exported.md" })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="Exported.pdf"'
    );
    expect(Buffer.from(await response.arrayBuffer()).toString()).toContain("%PDF-1.4");
  });

  it("returns 500 when PDF generation fails", async () => {
    renderPdfBufferMock.mockRejectedValue(new Error("missing chrome"));

    const response = await exportPdf(
      pdfRequest({ markdown: "# Exported", title: "Exported.md" })
    );

    expect(response.status).toBe(500);
  });

  it("rejects cross-origin requests before launching Chromium", async () => {
    const response = await exportPdf(
      new Request("http://localhost:3000/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.example",
          "X-Dillinger-Request": "same-origin",
        },
        body: JSON.stringify({ markdown: "# Exported" }),
      }) as never
    );

    expect(response.status).toBe(403);
    expect(renderPdfBufferMock).not.toHaveBeenCalled();
  });
});
