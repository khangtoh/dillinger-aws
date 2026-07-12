import { MAX_MARKDOWN_BYTES } from "@/lib/request-limits";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const PROVIDER_IDENTIFIER = /^[A-Za-z0-9._-]+$/;

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function boundedString(
  value: unknown,
  maxLength: number,
  options: { allowEmpty?: boolean; pattern?: RegExp } = {}
): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  if (!options.allowEmpty && value.length === 0) return null;
  if (CONTROL_CHARACTERS.test(value)) return null;
  if (options.pattern && !options.pattern.test(value)) return null;
  return value;
}

export function providerIdentifier(value: unknown): string | null {
  return boundedString(value, 255, { pattern: PROVIDER_IDENTIFIER });
}

export function providerPath(value: unknown): string | null {
  const path = boundedString(value, 1024);
  if (!path || path.includes("\\")) return null;

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }

  return path;
}

export function providerFilename(value: unknown): string | null {
  const filename = boundedString(value, 255);
  if (!filename || filename === "." || filename === ".." || /[\\/]/.test(filename)) {
    return null;
  }
  return filename;
}

export function encodeProviderPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function providerContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return Buffer.byteLength(value, "utf8") <= MAX_MARKDOWN_BYTES ? value : null;
}

export function optionalBoundedString(
  value: unknown,
  maxLength: number
): string | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  return boundedString(value, maxLength);
}

export function integerInRange(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number | null {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}
