import { ImageResponse } from "next/og";
import { astryxColorTokens } from "@/lib/theme/tokens";

export const runtime = "edge";
export const alt = "Dillinger - Online Markdown Editor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const light = (token: keyof typeof astryxColorTokens) =>
  astryxColorTokens[token][0];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: light("--color-background-body"),
          color: light("--color-text-primary"),
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          padding: 64,
        }}
      >
        <div
          style={{
            background: light("--color-background-surface"),
            border: `1px solid ${light("--color-border")}`,
            borderRadius: 28,
            boxShadow: "0 24px 60px #0F172A1F",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              color: light("--color-text-accent"),
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.12em",
              marginBottom: 24,
              textTransform: "uppercase",
            }}
          >
            Modern editorial workspace
          </div>
          <div
            style={{
              color: light("--color-text-primary"),
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: "-0.045em",
              marginBottom: 20,
            }}
          >
            Dillinger
          </div>
          <div
            style={{
              color: light("--color-text-secondary"),
              fontSize: 30,
              fontWeight: 400,
              marginBottom: 48,
            }}
          >
            Write Markdown. See the result. Stay in flow.
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              color: light("--color-text-secondary"),
              fontSize: 19,
            }}
          >
            {["Live preview", "Cloud sync", "Keyboard first", "Free"].map(
              (label) => (
                <span
                  key={label}
                  style={{
                    background: light("--color-accent-muted"),
                    borderRadius: 999,
                    color: light("--color-text-accent"),
                    padding: "10px 18px",
                  }}
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
