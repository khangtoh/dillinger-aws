import { describe, expect, it } from "vitest";
import { getExportFilename, renderHtmlDocument } from "@/lib/export";

describe("getExportFilename", () => {
  it("appends the correct extension", () => {
    expect(getExportFilename("notes", "html")).toBe("notes.html");
    expect(getExportFilename("readme.md", "pdf")).toBe("readme.pdf");
  });

  it("sanitizes special characters in title", () => {
    expect(getExportFilename("My File?.md", "html")).toBe("My_File_.html");
  });

  it("handles empty or undefined title with a default", () => {
    expect(getExportFilename("", "md")).toBe("document.md");
    expect(getExportFilename(undefined, "md")).toBe("document.md");
  });
});

describe("renderHtmlDocument", () => {
  it("returns a valid HTML document structure", () => {
    const result = renderHtmlDocument({ html: "<p>hi</p>" });
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<html lang=\"en\">");
    expect(result).toContain("</html>");
  });

  it("includes the title in the <title> tag", () => {
    const result = renderHtmlDocument({ title: "My Doc", html: "" });
    expect(result).toContain("<title>My Doc</title>");
  });

  it("escapes active markup in the document title", () => {
    const result = renderHtmlDocument({
      title: "</title><script>alert(1)</script>",
      html: "",
    });
    expect(result).not.toContain("<script>alert(1)</script>");
    expect(result).toContain("&lt;/title&gt;&lt;script&gt;");
  });

  it("adds a restrictive content security policy", () => {
    const result = renderHtmlDocument({ html: "<p>hi</p>" });
    expect(result).toContain("default-src 'none'");
  });

  it("includes provided HTML in the body", () => {
    const result = renderHtmlDocument({ html: "<h1>Hello</h1>" });
    expect(result).toContain("<h1>Hello</h1>");
    expect(result).toContain('<body id="preview">');
  });

  it("includes CSS when styled is true", () => {
    const result = renderHtmlDocument({ html: "", styled: true });
    expect(result).toContain("<style>");
    expect(result).toContain("font-family: Geist");
  });

  it("has no <style> tag when styled is false or omitted", () => {
    const plain = renderHtmlDocument({ html: "" });
    expect(plain).not.toContain("<style>");

    const explicitFalse = renderHtmlDocument({ html: "", styled: false });
    expect(explicitFalse).not.toContain("<style>");
  });

  it("does not load remote styles in the styled variant", () => {
    const result = renderHtmlDocument({ html: "", styled: true });
    expect(result).not.toContain("@import");
    expect(result).not.toContain("cdnjs.cloudflare.com");
  });
});
