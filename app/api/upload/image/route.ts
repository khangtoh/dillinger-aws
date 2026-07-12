export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { enforceSameOrigin } from "@/lib/csrf";
import { rejectOversizedRequest } from "@/lib/request-limits";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MULTIPART_SIZE = MAX_FILE_SIZE + 64 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function hasExpectedSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    );
  }
  if (type === "image/gif") {
    const header = Buffer.from(bytes.subarray(0, 6)).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") {
    return (
      Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
      Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
    );
  }
  return false;
}

function markdownAltText(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/([\\\[\]])/g, "\\$1")
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  const forbidden = enforceSameOrigin(request);
  if (forbidden) return forbidden;

  const oversized = rejectOversizedRequest(request, MAX_MULTIPART_SIZE);
  if (oversized) return oversized;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!hasExpectedSignature(file.type, buffer)) {
      return NextResponse.json(
        { error: "File content does not match its declared image type" },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const altText = markdownAltText(file.name);
    const markdown = `![${altText}](${dataUrl})`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      markdown,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
