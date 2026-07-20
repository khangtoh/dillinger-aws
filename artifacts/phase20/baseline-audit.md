# Phase 20 baseline audit

Date: 2026-07-19
Branch: `claude/modern-dillinger-aws`
Source commit: `4f582fa` (documentation-only; rendered UI predates Phase 20)
Source tenant:
`https://3tfsfijqedt62hf3vfdfxwunua0rkjgo.lambda-url.ap-southeast-1.on.aws/`

This is `before` evidence. It documents removal scope and must not be used as
future visual authority.

## Screenshot evidence

[`capture_before.py`](capture_before.py) seeded one deterministic document and
profile, loaded the deployed editor, emulated light/dark system preference, and
captured the six required viewports plus seven open states under [`before/`](before/).
The dark-media captures remain visually close to the light editor shell, which
is itself a baseline finding: the current application does not present two
deliberately designed, owned theme systems.

## Legacy Tailwind color tokens

Counts use `rg --count-matches <token> tailwind.config.ts app components` and
include the token definition. Every token in this table belongs to the current
legacy color system and must be replaced by the owned Phase 20 semantic bridge.

| Token | Matches | Files |
|---|---:|---:|
| `plum` | 127 | 32 |
| `bg-primary` | 12 | 9 |
| `bg-sidebar` | 37 | 27 |
| `bg-navbar` | 13 | 9 |
| `bg-highlight` | 40 | 15 |
| `bg-button-save` | 2 | 2 |
| `text-primary` | 36 | 13 |
| `text-invert` | 35 | 15 |
| `text-muted` | 143 | 32 |
| `border-light` | 63 | 22 |
| `border-settings` | 12 | 7 |
| `icon-default` | 10 | 5 |
| `dropdown-link` | 4 | 3 |
| `switchery` | 2 | 2 |

The non-color spacing and z-index tokens are not automatically legacy debt;
they may remain if the new shell still needs the same semantic measurements.

## Prohibited values, fonts, and extra literals

| Item | Matches | Files | Required removal |
|---|---:|---:|---|
| `#35D7BB` | 7 | 3 | Tailwind accent definition, preview links, Open Graph art |
| `#2B2F36` | 3 | 3 | Sidebar token, LogoBar, Open Graph background |
| `#373D49` | 5 | 2 | Navbar/text tokens and global/preview text |
| `Source Sans Pro` | 2 | 2 | Tailwind sans family and preview headings |
| `Georgia` | 2 | 2 | Tailwind serif family and preview prose |
| `Ubuntu Mono` | 3 | 3 | Tailwind mono family, preview code, Monaco configuration |
| `#1e1e1e`, `#FAFBFC`, or `#E8E8E8` | 11 | 4 | Preview night surface, preview pane, divider/borders |

Additional legacy preview literals in `app/globals.css`—including `#F5F7FA`,
`#666`, `#f9f9f9`, `#d4d4d4`, `#2d2d2d`, `#444`, `#555`, `#aaa`, and
`#252525`—must move to document-presentation tokens rather than survive as
one-off compatibility colors.

## Astryx runtime and override debt

- `components/providers/Providers.tsx` imports and mounts `neutralTheme` at
  runtime (two `neutralTheme` references).
- `app/globals.css` imports `@astryxdesign/theme-neutral/theme.css`; the package
  may remain installed only if Astryx needs it, but this stylesheet cannot be
  the unreviewed runtime identity.
- Ten Astryx-consuming files also apply legacy Tailwind color overrides:
  `components/editor/FormattingToolbar.tsx`, `components/navbar/Navbar.tsx`,
  `components/sidebar/Sidebar.tsx`, `components/ui/KeyboardShortcuts.tsx`,
  `components/modals/SettingsModal.tsx`, and the Bitbucket, Dropbox, GitHub,
  Google Drive, and OneDrive modal files.
- `components/navbar/Navbar.tsx` passes legacy colors into the swizzled Astryx
  DropdownMenu trigger; the DropdownMenu implementation otherwise consumes
  Astryx theme tokens directly.
- Toast, command palette, dialogs, segmented controls, collapsibles, buttons,
  toggles, button groups, and icon buttons therefore currently mix neutral
  theme defaults with per-call Tailwind legacy colors.

## Removal order

1. Define and mount the owned light/dark Astryx theme.
2. Bridge Tailwind utilities to the same semantic source without old aliases.
3. Migrate shell and Astryx call-site overrides surface by surface.
4. Migrate preview/global typography and hard-coded colors.
5. Migrate content/error/Open Graph routes and run the prohibited-token check.

## Contrast finding

[`check_contrast.py`](check_contrast.py) automates WCAG ratios for every
proposed text/accent/focus pairing. The original light muted text target
`#64748B` measured `4.34:1` on the raised surface `#F1F5F9`, below the required
`4.5:1`. Phase 20 therefore adjusts light muted text to `#627188`, which yields
`4.74:1` on canvas, `4.96:1` on primary surface, and `4.52:1` on raised surface.

The subtle border targets measure `1.23:1` in light mode and `1.41:1` in dark
mode. They are restricted to decorative separation. Interactive boundaries
must use a separate control-border/focus token meeting the `3:1` non-text
contrast requirement.

The foundation implementation adds `#64748B` as the emphasized control-border
token. The automated table now verifies it at `4.76:1` against the light
surface and `3.73:1` against the dark surface; the decorative subtle-border
restriction remains unchanged.
