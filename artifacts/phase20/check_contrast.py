#!/usr/bin/env python3
"""Print WCAG contrast evidence for the proposed Phase 20 palette."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Pair:
    mode: str
    foreground_name: str
    foreground: str
    background_name: str
    background: str
    minimum: float | None


PAIRS = (
    Pair("Light", "Strong text", "#0F172A", "Canvas", "#F8FAFC", 4.5),
    Pair("Light", "Strong text", "#0F172A", "Surface", "#FFFFFF", 4.5),
    Pair("Light", "Strong text", "#0F172A", "Raised", "#F1F5F9", 4.5),
    Pair("Light", "Muted text", "#5D6C82", "Canvas", "#F8FAFC", 4.5),
    Pair("Light", "Muted text", "#5D6C82", "Surface", "#FFFFFF", 4.5),
    Pair("Light", "Muted text", "#5D6C82", "Raised", "#F1F5F9", 4.5),
    Pair("Light", "Muted text", "#5D6C82", "Accent soft", "#EEF2FF", 4.5),
    Pair("Light", "Muted text", "#5D6C82", "Astryx keycap composite", "#F1F1F2", 4.5),
    Pair("Light", "Accent/link", "#4F46E5", "Canvas", "#F8FAFC", 4.5),
    Pair("Light", "Accent/link", "#4F46E5", "Surface", "#FFFFFF", 4.5),
    Pair("Light", "Accent/link", "#4F46E5", "Raised", "#F1F5F9", 4.5),
    Pair("Light", "On-accent", "#FFFFFF", "Accent", "#4F46E5", 4.5),
    Pair("Light", "Focus ring", "#4F46E5", "Surface", "#FFFFFF", 3.0),
    Pair("Light", "Control border", "#64748B", "Surface", "#FFFFFF", 3.0),
    Pair("Light", "Subtle border", "#E2E8F0", "Surface", "#FFFFFF", None),
    Pair("Dark", "Strong text", "#F8FAFC", "Canvas", "#0B1220", 4.5),
    Pair("Dark", "Strong text", "#F8FAFC", "Surface", "#111827", 4.5),
    Pair("Dark", "Strong text", "#F8FAFC", "Raised", "#182235", 4.5),
    Pair("Dark", "Muted text", "#94A3B8", "Canvas", "#0B1220", 4.5),
    Pair("Dark", "Muted text", "#94A3B8", "Surface", "#111827", 4.5),
    Pair("Dark", "Muted text", "#94A3B8", "Raised", "#182235", 4.5),
    Pair("Dark", "Accent/link", "#818CF8", "Canvas", "#0B1220", 4.5),
    Pair("Dark", "Accent/link", "#818CF8", "Surface", "#111827", 4.5),
    Pair("Dark", "Accent/link", "#818CF8", "Raised", "#182235", 4.5),
    Pair("Dark", "On-accent", "#0B1220", "Accent", "#818CF8", 4.5),
    Pair("Dark", "Focus ring", "#818CF8", "Surface", "#111827", 3.0),
    Pair("Dark", "Control border", "#64748B", "Surface", "#111827", 3.0),
    Pair("Dark", "Subtle border", "#273449", "Surface", "#111827", None),
)


def relative_luminance(hex_color: str) -> float:
    channels = [int(hex_color[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        channel / 12.92
        if channel <= 0.04045
        else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(foreground: str, background: str) -> float:
    lighter, darker = sorted(
        (relative_luminance(foreground), relative_luminance(background)),
        reverse=True,
    )
    return (lighter + 0.05) / (darker + 0.05)


def main() -> None:
    failed = False
    print("| Mode | Foreground | Background | Ratio | Requirement | Result |")
    print("|---|---|---|---:|---:|---|")
    for pair in PAIRS:
        ratio = contrast(pair.foreground, pair.background)
        if pair.minimum is None:
            requirement = "Informational"
            result = "Decorative separator only"
        else:
            requirement = f"{pair.minimum:.1f}:1"
            result = "Pass" if ratio >= pair.minimum else "Fail"
            failed = failed or result == "Fail"
        print(
            f"| {pair.mode} | {pair.foreground_name} `{pair.foreground}` | "
            f"{pair.background_name} `{pair.background}` | {ratio:.2f}:1 | "
            f"{requirement} | {result} |"
        )
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
