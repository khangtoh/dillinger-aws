import { describe, expect, it } from "vitest";
import {
  boundedString,
  encodeProviderPath,
  integerInRange,
  providerIdentifier,
  providerFilename,
  providerPath,
} from "@/lib/validation";

describe("provider input validation", () => {
  it("allows normal provider identifiers and rejects URL syntax", () => {
    expect(providerIdentifier("repo-name_1")).toBe("repo-name_1");
    expect(providerIdentifier("repo/name")).toBeNull();
    expect(providerIdentifier("repo?admin=true")).toBeNull();
  });

  it("rejects traversal and control characters in provider paths", () => {
    expect(providerPath("docs/readme.md")).toBe("docs/readme.md");
    expect(providerPath("../secret.md")).toBeNull();
    expect(providerPath("docs/\nsecret.md")).toBeNull();
  });

  it("encodes each path segment without losing directory structure", () => {
    expect(encodeProviderPath("docs/my notes.md")).toBe("docs/my%20notes.md");
  });

  it("allows display filenames but rejects path syntax", () => {
    expect(providerFilename("My notes.md")).toBe("My notes.md");
    expect(providerFilename("docs/notes.md")).toBeNull();
  });

  it("bounds generic strings", () => {
    expect(boundedString("main", 10)).toBe("main");
    expect(boundedString("", 10)).toBeNull();
    expect(boundedString("too long", 3)).toBeNull();
  });

  it("parses bounded integer query parameters", () => {
    expect(integerInRange(null, 30, 1, 100)).toBe(30);
    expect(integerInRange("50", 30, 1, 100)).toBe(50);
    expect(integerInRange("101", 30, 1, 100)).toBeNull();
    expect(integerInRange("1e2", 30, 1, 100)).toBeNull();
  });
});
