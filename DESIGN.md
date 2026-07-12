# DESIGN.md

> **A production-grade, human-centric design system**
> Derived from six reference mockups (dark-mode CRM, financial analytics, status pills, SaaS reports, Kanban, project board).
> Includes a paired **Light Mode** system and a dedicated **Map-Based Interface** section inspired by FocusFlight-class experiences.
>
> **Version:** 1.0.0 · **Last updated:** July 2026 · **Stack target:** React 19 + Tailwind v4 + Recharts / Tremor / MapLibre GL

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens — Dark Mode (Primary)](#2-design-tokens--dark-mode-primary)
3. [Design Tokens — Light Mode (Paired)](#3-design-tokens--light-mode-paired)
4. [Typography System](#4-typography-system)
5. [Spacing, Radius & Elevation](#5-spacing-radius--elevation)
6. [Iconography](#6-iconography)
7. [Component Blueprints](#7-component-blueprints)
8. [Motion & Animation Language](#8-motion--animation-language)
9. [Micro-Interactions Catalog](#9-micro-interactions-catalog)
10. [User Flow & Experience Principles](#10-user-flow--experience-principles)
11. [Map-Based Interface Design (FocusFlight-class)](#11-map-based-interface-design-focusflight-class)
12. [Data Visualization Guidelines](#12-data-visualization-guidelines)
13. [Anti-AI-Slop Checklist — How Not To Look Generated](#13-anti-ai-slop-checklist--how-not-to-look-generated)
14. [Tech Stack & Package Choices (July 2026)](#14-tech-stack--package-choices-july-2026)
15. [Accessibility & Inclusive Design](#15-accessibility--inclusive-design)
16. [Implementation Recipes](#16-implementation-recipes)

---

## 1. Design Philosophy

We are building interfaces that feel like **instruments, not templates**. Every mockup we studied has the same DNA:

- **Dense but calm.** Information density is high, but the eye is never overwhelmed because contrast is tiered (near-black → charcoal → text) and color is used with restraint (one accent hue per surface, semantic status colors only where they carry meaning).
- **Deferential chrome, expressive data.** The frame (sidebar, chrome, borders) recedes; the data (numbers, charts, avatars, status) is what glows.
- **A single moment of delight per screen.** The Mintify chart's emerald glow. Parlay's purple sparkline tooltip. FocusFlight's tiny plane crawling along a great-circle arc. Never more than one such moment — otherwise it becomes a fireworks show and stops meaning anything.

### The three non-negotiable principles

| Principle | What it means | What it kills |
|---|---|---|
| **Legibility over decoration** | If a border, glow, or gradient does not aid comprehension, it is deleted. | Glassmorphism-for-its-own-sake, neon everywhere, purple-blue gradients on every button. |
| **State is content** | A status pill is not "styling" — it is the primary signal. Design status *first*, then design what surrounds it. | Grey-on-grey "Pending" text that requires squinting. |
| **The user's data is the hero** | User avatars, real numbers, real names must feel more important than the app's brand. | Big brand logos in the workspace, giant illustrations of empty states. |

---

## 2. Design Tokens — Dark Mode (Primary)

Tokens are declared as CSS custom properties, consumed by Tailwind v4's `@theme` directive. Never hardcode a hex in a component.

```css
/* tokens.dark.css */
@layer base {
  :root[data-theme="dark"] {
    /* ---------- Surfaces (tiered depth) ---------- */
    --surface-0:        #0A0A0B;   /* app background — near-black, warmer than #000 */
    --surface-1:        #111113;   /* elevated section (sidebar, main canvas) */
    --surface-2:        #17171A;   /* card / panel */
    --surface-3:        #1E1E22;   /* card hover, popover, tooltip */
    --surface-4:        #26262B;   /* modal, dropdown */
    --surface-inverse:  #F5F5F7;   /* for inverse chips */

    /* ---------- Borders ---------- */
    --border-subtle:    rgba(255, 255, 255, 0.06);   /* card outlines */
    --border-default:   rgba(255, 255, 255, 0.09);   /* input borders */
    --border-strong:    rgba(255, 255, 255, 0.14);   /* focused inputs */
    --border-focus:     #6E7BFF;                     /* focus ring */

    /* ---------- Text ---------- */
    --text-primary:     #F4F4F5;   /* body & headings */
    --text-secondary:   #A1A1AA;   /* labels, metadata */
    --text-tertiary:    #71717A;   /* placeholders, timestamps */
    --text-disabled:    #52525B;
    --text-inverse:     #0A0A0B;

    /* ---------- Brand & Accent ---------- */
    --accent-primary:   #6E7BFF;   /* electric indigo — CTAs, active nav */
    --accent-primary-hover: #8590FF;
    --accent-primary-soft:  rgba(110, 123, 255, 0.12);
    --accent-secondary: #B57BFF;   /* purple, used sparingly for premium/AI */

    /* ---------- Semantic (status pills — matches reference image #3) ---------- */
    --status-pending-fg:      #F5A524;
    --status-pending-bg:      rgba(245, 165, 36, 0.10);
    --status-pending-border:  rgba(245, 165, 36, 0.22);

    --status-progress-fg:     #38BDF8;
    --status-progress-bg:     rgba(56, 189, 248, 0.10);
    --status-progress-border: rgba(56, 189, 248, 0.22);

    --status-submitted-fg:    #A78BFA;
    --status-submitted-bg:    rgba(167, 139, 250, 0.10);
    --status-submitted-border:rgba(167, 139, 250, 0.22);

    --status-review-fg:       #D4B106;
    --status-review-bg:       rgba(212, 177, 6, 0.10);
    --status-review-border:   rgba(212, 177, 6, 0.22);

    --status-success-fg:      #34D399;
    --status-success-bg:      rgba(52, 211, 153, 0.10);
    --status-success-border:  rgba(52, 211, 153, 0.22);

    --status-failed-fg:       #F87171;
    --status-failed-bg:       rgba(248, 113, 113, 0.10);
    --status-failed-border:   rgba(248, 113, 113, 0.22);

    --status-expired-fg:      #A1A1AA;
    --status-expired-bg:      rgba(161, 161, 170, 0.08);
    --status-expired-border:  rgba(161, 161, 170, 0.18);

    /* ---------- Data-viz palette (chart series) ---------- */
    --viz-1: #6E7BFF;   /* indigo */
    --viz-2: #34D399;   /* mint */
    --viz-3: #F5A524;   /* amber */
    --viz-4: #F472B6;   /* pink */
    --viz-5: #38BDF8;   /* sky */
    --viz-6: #A78BFA;   /* violet */
    --viz-grid:  rgba(255, 255, 255, 0.04);
    --viz-axis:  rgba(255, 255, 255, 0.12);

    /* ---------- Effects ---------- */
    --glow-success: 0 0 24px -4px rgba(52, 211, 153, 0.35);
    --glow-accent:  0 0 24px -4px rgba(110, 123, 255, 0.35);
    --shadow-card:      0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6);
    --shadow-popover:   0 12px 32px -8px rgba(0,0,0,0.65), 0 0 0 1px var(--border-subtle);
    --shadow-modal:     0 24px 64px -16px rgba(0,0,0,0.7);
  }
}
```

### Tailwind v4 wiring

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-surface-0: var(--surface-0);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-text: var(--text-primary);
  --color-muted: var(--text-secondary);
  --color-accent: var(--accent-primary);
  --radius-card: 14px;
  --radius-pill: 999px;
  --font-sans: "Inter", "Geist", system-ui;
  --font-display: "Geist", "Inter Display", system-ui;
  --font-mono: "JetBrains Mono", "Geist Mono", ui-monospace;
}
```

---

## 3. Design Tokens — Light Mode (Paired)

The light theme is **not** an inversion. It has its own personality: warmer paper-white surfaces, softer contrast on borders, and slightly desaturated status colors so they don't vibrate on white.

```css
:root[data-theme="light"] {
  /* ---------- Surfaces ---------- */
  --surface-0:        #FAFAF9;   /* app background — off-white with warm tint */
  --surface-1:        #FFFFFF;   /* sidebar, main canvas */
  --surface-2:        #FFFFFF;   /* card */
  --surface-3:        #F4F4F5;   /* card hover, popover */
  --surface-4:        #FFFFFF;   /* modal */
  --surface-inverse:  #17171A;

  /* ---------- Borders ---------- */
  --border-subtle:    rgba(15, 23, 42, 0.06);
  --border-default:   rgba(15, 23, 42, 0.10);
  --border-strong:    rgba(15, 23, 42, 0.16);
  --border-focus:     #4F46E5;

  /* ---------- Text ---------- */
  --text-primary:     #0A0A0B;
  --text-secondary:   #52525B;
  --text-tertiary:    #71717A;
  --text-disabled:    #A1A1AA;
  --text-inverse:     #FAFAF9;

  /* ---------- Brand ---------- */
  --accent-primary:   #4F46E5;
  --accent-primary-hover: #6366F1;
  --accent-primary-soft:  rgba(79, 70, 229, 0.08);
  --accent-secondary: #7C3AED;

  /* ---------- Semantic (desaturated for white BG) ---------- */
  --status-pending-fg:      #B45309;
  --status-pending-bg:      #FEF3C7;
  --status-pending-border:  #FDE68A;

  --status-progress-fg:     #0369A1;
  --status-progress-bg:     #E0F2FE;
  --status-progress-border: #BAE6FD;

  --status-submitted-fg:    #6D28D9;
  --status-submitted-bg:    #EDE9FE;
  --status-submitted-border:#DDD6FE;

  --status-review-fg:       #854D0E;
  --status-review-bg:       #FEF9C3;
  --status-review-border:   #FEF08A;

  --status-success-fg:      #047857;
  --status-success-bg:      #D1FAE5;
  --status-success-border:  #A7F3D0;

  --status-failed-fg:       #B91C1C;
  --status-failed-bg:       #FEE2E2;
  --status-failed-border:   #FECACA;

  --status-expired-fg:      #52525B;
  --status-expired-bg:      #F4F4F5;
  --status-expired-border:  #E4E4E7;

  /* ---------- Data-viz (slightly darker in light mode) ---------- */
  --viz-1: #4F46E5;
  --viz-2: #059669;
  --viz-3: #D97706;
  --viz-4: #DB2777;
  --viz-5: #0284C7;
  --viz-6: #7C3AED;
  --viz-grid: rgba(15, 23, 42, 0.05);
  --viz-axis: rgba(15, 23, 42, 0.15);

  /* ---------- Effects (softer in light mode) ---------- */
  --glow-success: 0 0 20px -4px rgba(5, 150, 105, 0.20);
  --glow-accent:  0 0 20px -4px rgba(79, 70, 229, 0.18);
  --shadow-card:      0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08);
  --shadow-popover:   0 12px 32px -8px rgba(15,23,42,0.12), 0 0 0 1px var(--border-subtle);
  --shadow-modal:     0 24px 64px -16px rgba(15,23,42,0.18);
}
```

### Theme toggle rules

- **Persist** in `localStorage` under key `theme` — but always read `prefers-color-scheme` first-load.
- **Never** flash the wrong theme. Inline a blocking `<script>` in `<head>` that sets `data-theme` on `<html>` before paint.
- Transition surface colors with `transition: background-color 180ms ease-out` — **do not** transition text (causes fuzzy repaint).

---

## 4. Typography System

**Type family (July 2026 recommendation):**
- **Body & UI:** `Inter` (variable) or `Geist` (Vercel's variable release, tightened numerals — excellent for dashboard numerals)
- **Display / hero numbers:** `Geist` at optical size ≥ 32px, `font-feature-settings: "ss01", "cv11"`
- **Mono (data, IDs, invoice numbers):** `JetBrains Mono` or `Geist Mono`

### Scale (modular, base 16, ratio 1.200)

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-display-2xl` | 56 / 60 | 600 | -0.03em | Hero KPI (Parlay's `$8,492.11`) |
| `text-display-xl`  | 44 / 48 | 600 | -0.025em | Section hero |
| `text-display-lg`  | 32 / 38 | 600 | -0.02em | Card KPI (`$1.45M`) |
| `text-h1` | 24 / 30 | 600 | -0.015em | Page title (`Acme Corporation`) |
| `text-h2` | 20 / 26 | 600 | -0.01em | Section title (`Reports`) |
| `text-h3` | 16 / 22 | 600 | -0.005em | Card title |
| `text-body` | 14 / 20 | 400 | 0 | Default body |
| `text-body-sm` | 13 / 18 | 400 | 0 | Table cells |
| `text-caption` | 12 / 16 | 500 | 0.01em | Metadata, timestamps |
| `text-overline` | 11 / 14 | 500 | **0.08em UPPERCASE** | KPI labels (`TOTAL PROJECTS`) |
| `text-mono` | 13 / 18 | 500 | 0 | `INV-2026-001`, IDs |

### Rules

1. **Numbers get tabular figures.** Always `font-variant-numeric: tabular-nums` on any element containing numeric data. Ledgers, KPIs, tables — all of it. Without this, `$1.45M` and `$1.28M` don't line up and the UI feels amateurish.
2. **Uppercase labels are ≤11px and MUST have ≥0.08em tracking.** Anything else looks screamy.
3. **Never mix more than 2 weights** on a single card: 400 body + 600 emphasis. 500 is only for labels/mono.
4. **Currency prefix (`$`) is 0.85em of its number.** Look at the reference `$1.45M` — the dollar sign is smaller. Apply via `<span class="text-[0.85em] text-muted mr-0.5">$</span>`.

---

## 5. Spacing, Radius & Elevation

### Spacing scale (4px base)

```
0.5 → 2px    | 1 → 4px    | 1.5 → 6px    | 2 → 8px    | 2.5 → 10px
3 → 12px     | 4 → 16px   | 5 → 20px     | 6 → 24px   | 8 → 32px
10 → 40px    | 12 → 48px  | 16 → 64px    | 20 → 80px
```

**Cadence rule:** Every screen picks a "beat" — 16px OR 20px OR 24px — and every gap on that screen is a multiple. Mixing 16 and 20 in the same layout is the #1 tell of an AI-generated design.

### Border radius

| Token | Value | Use |
|---|---|---|
| `radius-pill` | 999px | Status badges, filter chips, avatars |
| `radius-sm` | 6px | Small buttons, table row hover |
| `radius-md` | 10px | Inputs, dropdowns |
| `radius-lg` | 14px | **Default card** (matches all references) |
| `radius-xl` | 20px | Modals, hero panels |
| `radius-2xl` | 28px | Marketing surfaces only |

**Never** use `border-radius: 8px`. It's the Bootstrap default and screams "I didn't customize." Prefer 10 or 14.

### Elevation (dark mode)

- **Level 0** — flat on surface, only 1px inset highlight from `--border-subtle`.
- **Level 1** — card: `--shadow-card` + `--surface-2`.
- **Level 2** — popover/tooltip: `--shadow-popover` + `--surface-3` + 1px border.
- **Level 3** — modal: `--shadow-modal` + `--surface-4` + backdrop blur `12px` behind.

In dark mode, **borders do the work of shadows**. A 1px `rgba(255,255,255,0.06)` inset is more effective than a drop shadow because there's nothing to shadow onto.

---

## 6. Iconography

**Library:** `lucide-react` (successor to Feather, 1400+ icons, tree-shakeable, actively maintained through 2026).

**Rules:**
- **Stroke width `1.5`** for all icons ≥16px. `2` looks childish; `1` disappears on retina.
- **Icon color inherits `currentColor`** — never hardcode.
- **Icons in status pills are 14px, gap-1.5 (6px) from label.**
- **Sidebar icons are 18px, gap-3 (12px) from label.**
- **Table row action icons are 16px, opacity-60 → opacity-100 on row hover.**

**Custom icon exceptions** — commission or hand-draw when:
- The concept is domain-specific (a Kanban swim-lane icon, a flight-route icon).
- You need a mascot-quality moment (FocusFlight's tiny 3D plane).

---

## 7. Component Blueprints

### 7.1 Sidebar Navigation

Observed pattern (Acme Inc, Mintify, Over9k, GR8R HRM): fixed-width **240–280px**, three vertical zones:

```
┌─────────────────────────────┐
│  [Workspace switcher]       │  ← 64px tall, logo + name + chevron
├─────────────────────────────┤
│  Search  ⌘K                 │  ← optional command bar
│                             │
│  ▸ Main                     │  ← section heading, overline style
│    🏠 Home                  │
│    ✅ Task                  │
│    📁 Projects   ● active   │  ← active: surface-3 bg + 2px accent left bar
│                             │
│  ▸ Favorites  ⭐            │  ← starred items get colored icon
│    🟢 UK & EU Companies     │
│                             │
├─────────────────────────────┤
│  [User avatar] Settings ⚙   │  ← anchored to bottom
└─────────────────────────────┘
```

**Anatomy:**
- Item height: `36px`
- Horizontal padding: `12px`
- Item radius: `8px`
- Active state: `background: var(--surface-3)` + `2px solid var(--accent-primary)` left indicator (inset, not outside)
- Icon: 18px, `--text-secondary` (inactive) / `--text-primary` (active)
- Text: 14px/500

### 7.2 KPI / Metric Card

Observed in all business dashboards. Anatomy:

```
┌──────────────────────────────────────┐
│  TOTAL INVOICED           [ ⊙ ]  ← 11px overline + optional action
│                                      │
│  $1.45M                          ← 32/600 display, tabular-nums
│                                      │
│  +12.2% ↑ last 12 months         ← 13px caption, semantic color
└──────────────────────────────────────┘
```

- Padding: `20px`
- Radius: `14px`
- Border: `1px var(--border-subtle)`
- Optional sparkline: bottom-right, 60×24px, no axes, `strokeWidth 1.5`
- **Delta indicator** uses the semantic color (`--status-success-fg` for positive, `--status-failed-fg` for negative). Arrow is **before** the percentage, not after.

### 7.3 Status Pill

Directly from reference image #3. This is the single most-copied component in the system.

```tsx
<span
  className="
    inline-flex items-center gap-1.5
    px-2.5 py-1
    rounded-full
    text-[12px] font-medium
    border
  "
  style={{
    color:           'var(--status-success-fg)',
    backgroundColor: 'var(--status-success-bg)',
    borderColor:     'var(--status-success-border)',
  }}
>
  <CheckCircle2 size={14} strokeWidth={2} />
  Success
</span>
```

**Icon set per state:** Pending → `AlertTriangle`, In progress → `LoaderCircle` (spinning dashed), Submitted → `Send`, In review → `Sparkles`, Success → `CheckCircle2`, Failed → `XCircle`, Expired → `Clock`.

The `In progress` icon **rotates continuously** at `2s linear infinite`. This is the only always-on animation allowed in a table cell — it's a functional indicator, not decoration.

### 7.4 Data Table

Observed in GR8R HRM invoice table. Non-negotiables:

- **Row height:** `52px` for content-rich rows, `44px` for dense/list mode.
- **Column dividers:** never. Use whitespace and row-hover backgrounds.
- **Row hover:** `background: var(--surface-3)`, no border change, transition 100ms.
- **First cell** left-padded `16px`, all others `12px`.
- **Sort icons** appear only when the column is hovered or active.
- **Sticky header** with `backdrop-blur-md` and `background: color-mix(in oklab, var(--surface-2) 80%, transparent)`.
- **Empty state** is not "No data" text — it's an illustration + one primary CTA + one link.

### 7.5 Kanban Card

From Over9k and Acme Inc references:

```
┌────────────────────────────────┐
│  🏷 UI design                  │  ← category tag (colored pill)
│                                │
│  Rewrite cards titles          │  ← title, 14/600
│                                │
│  We've gotten some updates...  │  ← 13/400, secondary, 2-line clamp
│                                │
│  ─────────────────────         │
│  👤👤👤 +2         💬 2  📎 118 │  ← avatar stack + meta
└────────────────────────────────┘
```

- Card radius: `10px`
- Card border: `1px var(--border-subtle)`, hover raises to `--border-default`
- **Avatar stack** overlap: `-8px margin-left`, 2px ring in surface color
- **Drag handle** is the whole card body; a dedicated grip icon appears top-right on hover only
- **Drop zone** shows a `2px dashed var(--accent-primary)` outline with `--accent-primary-soft` fill

### 7.6 Chart Tooltip (Recharts custom)

The Mintify and Parlay tooltips are exemplary. Rules:

- Container: `--surface-3`, `radius-md`, `--shadow-popover`, padding `10px 12px`
- Timestamp header: 11px/500 uppercase, `--text-tertiary`
- Series row: `▎` 3px colored bar + label + value (mono, tabular)
- Positioned above the cursor with `8px` offset, **never** covers the data point
- **Cursor line:** vertical `1px dashed var(--border-strong)` full-height
- Fade in: `120ms ease-out`, no scale animation (looks nervous)

---

## 8. Motion & Animation Language

### Duration & easing tokens

```css
--dur-instant: 80ms;    /* hover color shifts */
--dur-fast:    140ms;   /* button press, tooltip fade */
--dur-base:    220ms;   /* card expand, drawer slide */
--dur-slow:    360ms;   /* modal, page transition */
--dur-glacial: 720ms;   /* hero reveal, onboarding */

--ease-out:      cubic-bezier(0.22, 1, 0.36, 1);       /* default */
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);       /* symmetric */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);    /* playful — use sparingly */
--ease-linear:   linear;                                /* progress bars, loaders */
```

**Golden rule:** if you're not sure, use `--dur-base` with `--ease-out`. Never use `ease` (the CSS default) — it's the AI-generated giveaway.

### What animates, what doesn't

| ✅ Always animate | ❌ Never animate |
|---|---|
| Modal enter/exit | Text color (causes subpixel shimmer) |
| Drawer slide | Font-weight (causes reflow) |
| Card hover elevation | Font-size (jitters layout) |
| Chart series entering | `display: none ↔ block` (use opacity+visibility) |
| Skeleton loaders | Cursor changes |
| Route transitions | Icons on load (motion should reward interaction) |

### Signature motions (build these once, reuse forever)

1. **Number rollup.** KPI values on mount count up from 0 to target over 600ms with `--ease-out`. Use `framer-motion`'s `animate` on a numeric motionValue and format via `Intl.NumberFormat`.
2. **Sparkline draw-on.** On mount, animate `stroke-dashoffset` from `pathLength` → `0` over 800ms. Then the area fill fades in over 200ms.
3. **Row shimmer on data update.** When a row's data changes via WebSocket, briefly (400ms) tint its background `--accent-primary-soft` then fade back. Signals "this is fresh" without a toast.
4. **Success confirm.** After a successful action, the primary button briefly (300ms) morphs from label → `CheckCircle2` icon, then reverts. No modal, no toast, no confetti.

### Reduced-motion contract

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

But keep **critical** feedback (skeleton loaders, success confirms) — replace with an instant state change, not a removal.

---

## 9. Micro-Interactions Catalog

Every micro-interaction below is required for the system to feel finished.

| Interaction | Behavior | Timing |
|---|---|---|
| **Button hover** | Background lifts one surface step. Icon shifts 2px in the button's direction (`→` icon on "Continue" moves right on hover). | 120ms out, 200ms return |
| **Button press** | Scale `0.97`, background darkens 1 step, subtle inset shadow. | 80ms |
| **Input focus** | Border → `--border-focus`. A 3px `--accent-primary-soft` ring blooms outside the border. | 140ms |
| **Toggle switch** | Thumb travels with `--ease-spring`. Background color transitions with `--ease-out` (mismatched intentionally — thumb feels physical). | 220ms |
| **Checkbox check** | Draw the check mark stroke on with `stroke-dashoffset` animation. Box fills in first, then check draws. | 180ms total |
| **Copy to clipboard** | The copy icon morphs to a checkmark for 1.2s, then reverts. Show a tiny "Copied" pill above the button that fades out. | Instant + 1200ms hold |
| **Delete confirm** | The delete button, when clicked once, expands inline to "Are you sure?" with a Confirm/Cancel pair. No modal for destructive ops on individual rows. | 220ms width expand |
| **Search results** | Results appear item-by-item with 30ms stagger. Highlight matched substring in `--accent-primary`. | 30ms × n |
| **Tab switch** | Underline slides horizontally between tabs (shared `layoutId` in framer-motion). Content cross-fades. | 260ms slide, 140ms fade |
| **Notification dot** | Small pulsing dot (2s ease-in-out infinite alternate opacity 0.4↔1). Never scale — that's a rookie mistake. | 2s loop |
| **Sidebar collapse** | Items shrink to icon-only. Labels fade over 100ms *before* the width transition (200ms) so text doesn't wrap mid-flight. | 300ms total |
| **Drag feedback** | Card scales `1.03`, shadow deepens, rotates `2deg`, cursor becomes `grabbing`. Drop targets pulse their border. | On grab |
| **Table sort** | The sort indicator arrow flips (rotate 180deg) with spring easing. Rows re-order with FLIP animation (auto-animate). | 320ms |

---

## 10. User Flow & Experience Principles

### The Three-Read Rule

Every screen must survive being read at three depths:
1. **Glance (0.5s):** the biggest number and the biggest color tell the story.
2. **Scan (5s):** section headings and status pills fill in the narrative.
3. **Study (30s+):** tables, charts, and details reward deeper engagement.

If a user can't answer "what am I looking at?" in 0.5s, redesign the hierarchy — not the palette.

### Progressive disclosure

- **Never** front-load a form with 12 fields. Split into steps (max 3–5 fields per step, use `elicitation`-style guided wizards for anything with more than ~7 total fields).
- **Never** render an empty table. Show either (a) a helpful empty state with sample data preview, or (b) an inline CTA to import/create.
- **Never** show a toast for a successful primary action. The UI itself should show the change (row appears in the table, KPI updates). Toasts are for **incidental** confirmation ("Copied", "Saved draft").

### Loading strategy

1. **0–200ms:** show nothing. Instant response is better than a flash of skeleton.
2. **200–800ms:** show a **content-shaped skeleton** (same dimensions as the real component, animated shimmer with `background-position` gradient, 1.5s loop).
3. **800ms+:** show skeleton *plus* an accessible status text ("Loading invoices…") for screen readers.
4. **Optimistic UI** for creates/updates: apply the change immediately with a subtle "pending" opacity (`opacity: 0.6`) until server confirms. On failure, animate back and show inline error.

### Empty states

Empty states are the resume of a designer. Every empty state must contain:
- A small **illustration** (never a stock icon — commission or draw simple line art).
- A **one-line explanation** in `--text-primary`.
- A **subline** in `--text-secondary` explaining what happens after they act.
- **One primary CTA**. Optionally one secondary link ("Import instead").
- Optional: a "sample data" ghost preview so the user knows what filled looks like.

### Error handling

- **Inline first.** Field errors live under the field, in `--status-failed-fg`, 13px, with an alert icon.
- **Global errors** are a top banner (`--status-failed-bg`, dismissable, offers a "Retry" button).
- **Never** blame the user. "We couldn't reach the server — retry?" not "Invalid request."

---

## 11. Map-Based Interface Design (FocusFlight-class)

The map is the most opinionated surface in the app. It has its own rules that override much of the standard design system.

### 11.1 Foundational choices

| Decision | Recommendation (July 2026) | Why |
|---|---|---|
| Renderer | **MapLibre GL JS v5** + **deck.gl v9** overlay | Open-source, no tile bill, WebGL-fast; deck.gl handles data layers (arcs, hexagons, trip animations) that MapLibre alone can't do well. |
| Basemap style | **Custom style JSON** — never Mapbox Streets default | Off-the-shelf styles are the #1 give-away of "generic map app". Build a monochrome style with your accent color as the only saturation. |
| Tile provider | Protomaps (self-hostable pmtiles) or MapTiler | Protomaps means no per-request cost and full offline. |
| Projection | Mercator for everyday UI, **Globe projection** for hero moments (great-circle flight arcs) | MapLibre v5 supports globe natively. |
| Terrain | Optional 3D terrain layer at zoom ≥ 8 | Turn it on for immersive views, off for dense data displays. |

### 11.2 The map as a canvas — visual rules

- **Desaturate everything except your data.** Land = `#0F1114`, water = `#0A0C10`, roads = `#1A1D22` with `--border-strong` at zoom > 12. Labels only appear at zoom ≥ 10, in `--text-tertiary`.
- **One saturated color for user data.** Flight paths, routes, hexagon densities — all use `--accent-primary` (or its map-specific sibling `--accent-map: #6EE7B7` if you want the emerald FocusFlight glow).
- **Glow is earned.** Add a WebGL blur pass only on active/selected elements. Never on the whole layer.
- **Labels wear halos.** Every map label gets a 2px halo in `--surface-0` at 60% opacity so it stays readable over any terrain.

### 11.3 The FocusFlight signature: plane-on-arc animation

The single most memorable interaction in map UIs of 2026 is the animated plane crawling along a great-circle route.

**Recipe:**
1. Compute the geodesic path between origin and destination using `@turf/great-circle` at 128 sampling points.
2. Render the arc with deck.gl's `PathLayer`, `getColor: [110, 123, 255, 200]`, `getWidth: 2`, `widthUnits: 'pixels'`.
3. Overlay a `TripsLayer` where the plane's position interpolates along the path — bind its `currentTime` to a `requestAnimationFrame` loop.
4. The plane sprite is a **small custom SVG**, not an emoji. 24×24px, tinted with the accent. Rotate it to face the tangent of the path at each frame.
5. **Contrail:** trailing gradient path, opacity fades over 8s of trip time.
6. **Camera:** when a route is selected, animate the camera with `map.flyTo({ center, zoom, pitch: 45, bearing: <arc-bearing>, duration: 2200, easing: t => 1 - Math.pow(1 - t, 3) })`.

### 11.4 Map UI chrome

The chrome around the map is different from standard cards — it **floats** on the map with heavy backdrop blur:

```css
.map-panel {
  background: color-mix(in oklab, var(--surface-2) 78%, transparent);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.5);
}
```

**Anchoring:**
- **Top-left:** search / origin input, ~360px wide
- **Top-right:** layer toggles, view mode (Map / Satellite / 3D), share
- **Bottom-center:** primary CTA (Start focus session, Book flight, etc.)
- **Right rail:** contextual detail card that slides in when a route/point is selected
- **Bottom-left:** attribution + scale — small, muted, non-negotiable for legal reasons

### 11.5 Map interactions

| Gesture | Behavior |
|---|---|
| **Scroll** | Zoom, centered on cursor. Never centered on map center — that's disorienting. |
| **Two-finger drag / right-click drag** | Rotate + tilt (pitch). Show a "Reset north" compass button that appears whenever bearing ≠ 0. |
| **Click point of interest** | Detail card slides in from right (280ms). Map re-centers with **soft** offset (map padding right = card width) so the POI stays visible. |
| **Hover route** | Route glows brighter, thickness increases 2 → 3px, tooltip shows origin/dest/duration. |
| **Long-press / right-click empty map** | Contextual menu: "Drop pin here", "Start route from here". |

### 11.6 Data density strategies

- **< 100 points:** individual circle markers, size 8px, `--accent-primary` fill, `--surface-0` stroke 2px.
- **100–5,000 points:** deck.gl `ScatterplotLayer` with radius pixels.
- **5,000–100,000 points:** deck.gl `HexagonLayer` — bin into hex cells, color-encode density with a two-color gradient (`--surface-2` → `--accent-primary`).
- **100,000+ points:** `HeatmapLayer` with GPU KDE.
- **Trajectories:** `TripsLayer` with trailLength ≈ 180 frames.

### 11.7 Map modes

Three standard modes, toggled from the top-right chip group:

1. **Map** — the monochrome vector style, default.
2. **Satellite** — raster imagery, but with a `filter: brightness(0.7) saturate(0.8)` overlay so it doesn't overpower data. Labels still float on top.
3. **3D** — pitch to 60°, enable terrain + building extrusion. Reserve for hero/exploration moments; never make it default (mobile can't handle it).

Transition between modes is a **200ms crossfade**, not an instant swap.

### 11.8 Accessibility on maps

Maps are the least accessible common UI. Compensate with:
- Every map has a **"List view" toggle** that renders the same data as an accessible table.
- All map interactions are keyboard-reachable (arrow keys pan, `+/-` zoom, `Tab` cycles through POIs).
- Announce POI selection to screen readers via `aria-live="polite"`.
- Never encode information in color alone on a map — always pair with shape (circles vs. squares) or size.

---

## 12. Data Visualization Guidelines

### Library choice (July 2026)

| Use case | Library | Why |
|---|---|---|
| **Default dashboards** | **Recharts v3** | Best React ergonomics, composable, actively maintained, matches our reference aesthetic. |
| **SaaS-shaped KPI dashboards with pre-styled components** | **Tremor v4** | Ships with our aesthetic almost out of the box. Great for prototyping. |
| **Custom, publication-grade** | **Visx** (Airbnb) | D3 primitives in React. Use when Recharts limits you. |
| **Geospatial** | **deck.gl v9** | See map section. |
| **Big data / real-time / financial** | **Apache ECharts (via echarts-for-react)** | Canvas rendering, handles 100k+ points without sweating. |

**Avoid** in 2026: Chart.js (feels dated), Victory (maintenance uncertain), Nivo (heavy, styling fights you).

### Chart aesthetic rules

1. **Grid lines are horizontal only.** Vertical grid lines almost always add noise. Set `<CartesianGrid vertical={false} stroke="var(--viz-grid)" />`.
2. **No axis lines.** Set `axisLine={false}` on both `<XAxis>` and `<YAxis>`. Ticks provide enough anchor.
3. **Tick labels are `--text-tertiary`, 11px.** Not 12, not 13.
4. **Currency/percentages are formatted with `Intl.NumberFormat`.** Never raw numbers. `$52,402.55` reads instantly; `52402.55` does not.
5. **Every chart has a "compact" mode.** Below 320px width, drop the Y-axis, drop the legend, keep the line/area and the tooltip.
6. **Area charts have gradient fills** — from series color at 40% opacity to 0% opacity over the chart height. Use `<defs><linearGradient>`.
7. **Line + area combo:** always the same color for both. The line is `strokeWidth: 2`, the area fill uses the gradient above.
8. **Bar charts:** rounded top corners only (`[4, 4, 0, 0]` in Recharts). Bar width auto-computed; gap between bars = bar width × 0.35.
9. **Pie/donut:** almost always the wrong choice. Prefer horizontal stacked bar or grouped bar. If you must use a donut, minimum slice size is 5% — smaller slices become an "Other" segment.
10. **Legends** go **above** the chart, aligned right, dot markers (not squares).

### Sparkline recipe (Recharts)

```tsx
<ResponsiveContainer width="100%" height={40}>
  <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
    <defs>
      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--viz-1)" stopOpacity={0.35} />
        <stop offset="100%" stopColor="var(--viz-1)" stopOpacity={0}    />
      </linearGradient>
    </defs>
    <Area
      type="monotone"
      dataKey="value"
      stroke="var(--viz-1)"
      strokeWidth={1.5}
      fill="url(#sparkGradient)"
      isAnimationActive
      animationDuration={800}
      animationEasing="ease-out"
    />
  </AreaChart>
</ResponsiveContainer>
```

---

## 13. Anti-AI-Slop Checklist — How Not To Look Generated

This is the section that separates our system from the sea of Claude/v0/Cursor-generated dashboards. Every item is a real red-flag pattern that appears in AI-generated UI, and how we avoid it.

### 13.1 Visual tells to eliminate

| ❌ Generic AI aesthetic | ✅ Our approach |
|---|---|
| **Purple-to-blue gradient CTA button** | Solid `--accent-primary` with a 1px inner-top highlight `rgba(255,255,255,0.08)`. Gradients only on data (charts). |
| **Every card has a shadow AND a border AND a gradient BG** | Cards have ONE of: subtle border OR subtle shadow. Not both. Not a background gradient. |
| **`emoji-in-a-rounded-square` for icons** | Real Lucide icons, monochrome, `currentColor`. |
| **"Card grids" of identical 3×3 tiles** | Asymmetric layouts (bento grids with a hero + smaller cards). Never a perfect grid. |
| **Placeholder text like "Lorem ipsum" or fake perfectly-round numbers ($1,000, $5,000)** | Numbers with awkward, real-looking precision ($52,402.55, $32,020.15). Names of real people (from a reviewed list, not John Doe). |
| **Every icon is a Feather stroke-1.5 outline** | Mix outline (default) with a few filled icons for active/selected states. |
| **Rainbow tag colors on Kanban** | 4–5 designated tag hues from the palette, semantic-mapped ("Design" is always the same color). |
| **Symmetric hero: text-left, image-right** | Break the symmetry — the image bleeds off the edge, or the text sits on top of the image with backdrop-blur. |
| **`text-4xl font-bold`** for every heading | Optical size adjustments: display fonts at ≥32px, tighten tracking to `-0.02em`. AI never does this. |
| **Auto-generated stock photos of "diverse team high-fiving"** | Product screenshots, real user data, hand-drawn line illustrations for empty states. |
| **The word "Seamlessly" or "Effortlessly" anywhere** | Concrete verbs. "Track invoices." "Ship code." No adverbs. |
| **CTAs that all say "Get started" / "Learn more"** | Verb-specific: "Import invoices", "Track this flight", "Schedule review". |

### 13.2 Structural tells to eliminate

- **Everything is centered.** AI centers everything because it's the safe average. Real interfaces align left, right, or against a specific grid rhythm. **The default alignment in this system is left-aligned.**
- **No section breathes differently from another.** Real designers give the hero section 96px vertical padding and the section below it 48px — because they're not the same weight. AI uses the same padding everywhere.
- **Every list is 5 items.** Because the AI hedge is "5". Ours vary: some are 3, some are 8, based on what the data actually needs.
- **"3-column feature grid" below the hero.** Break the mold: use a 2-column with an oversized left illustration, or a horizontal scroller.
- **Every screen has a "Getting Started" and "Recent Activity" widget.** Kill the templates. Ask: what does *this specific user* need on *this specific screen*?

### 13.3 Content tells to eliminate

Content is where AI leaks most obviously:

- Never use the em-dash-then-buzzword rhythm ("It's not just a dashboard — it's a command center").
- Never use tricolons ("Fast. Simple. Powerful.").
- Never use marketing metaphors ("Your data, unleashed").
- Copy is **short, specific, and referential to the actual user's data**: "You have 3 invoices pending review since Dec 15" is better than "Stay on top of pending items."

### 13.4 The 5-minute smell test

Before shipping any screen, run through this list. If you fail **any**, redesign:

1. Does the largest text on screen refer to the user's actual data, not the product name?
2. Is there at least one asymmetry (one card wider, one section offset, one element bleeding off the grid)?
3. Are there fewer than 3 distinct border-radius values on screen?
4. Are there ≤ 2 saturated colors (excluding status pills)?
5. Does at least one number have awkward, real-looking precision (not $1,000)?
6. Would a human take longer than 20 minutes to build this by hand? (If not, it's probably formulaic.)

---

## 14. Tech Stack & Package Choices (July 2026)

### Core stack

```jsonc
// package.json — recommended dependencies (July 2026)
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "next": "^15.4.0",                   // or Remix v3 / Astro v5

    // Styling
    "tailwindcss": "^4.1.0",             // v4 uses @theme, CSS-first config
    "tailwind-merge": "^3.0.0",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.8.0",

    // Component primitives
    "@radix-ui/react-*": "latest",       // unstyled, accessible
    // OR the shadcn/ui approach (copy-paste primitives)

    // Charts
    "recharts": "^3.2.0",
    "@tremor/react": "^4.0.0",           // optional, for KPI-heavy prototyping

    // Motion
    "framer-motion": "^12.0.0",          // now "motion" package
    "@formkit/auto-animate": "^0.9.0",   // magic layout animations

    // Maps
    "maplibre-gl": "^5.0.0",
    "@deck.gl/core": "^9.1.0",
    "@deck.gl/layers": "^9.1.0",
    "@deck.gl/react": "^9.1.0",
    "@turf/turf": "^7.2.0",

    // Icons & fonts
    "lucide-react": "^0.500.0",
    "geist": "^1.5.0",

    // Data & utilities
    "@tanstack/react-query": "^5.80.0",
    "@tanstack/react-table": "^8.20.0",
    "zod": "^4.0.0",
    "date-fns": "^4.1.0",

    // Forms
    "react-hook-form": "^7.60.0",
    "@hookform/resolvers": "^4.0.0",

    // Numbers
    "@formatjs/intl-numberformat": "^8.15.0"  // if targeting older browsers
  }
}
```

### File organization

```
src/
├── styles/
│   ├── tokens.dark.css
│   ├── tokens.light.css
│   └── globals.css
├── components/
│   ├── primitives/     # Button, Input, Badge, Card — built on Radix
│   ├── data/           # KpiCard, DataTable, StatusPill, Sparkline
│   ├── charts/         # AreaChart, BarChart, TrendLine (Recharts wrappers)
│   ├── layout/         # Sidebar, Topbar, PageShell
│   └── map/            # MapCanvas, MapPanel, RouteArc, POIMarker
├── hooks/
│   ├── useTheme.ts
│   ├── useReducedMotion.ts
│   └── useKeyboardShortcut.ts
└── lib/
    ├── format.ts       # money, dates, delta formatters
    ├── colors.ts       # token → resolved value helpers
    └── geo.ts          # great-circle, bearing, distance
```

---

## 15. Accessibility & Inclusive Design

- **WCAG 2.2 AA minimum, AAA where possible.** Dark mode makes contrast easier — no excuse for failing.
- **Focus visibility is sacred.** Every interactive element has a `:focus-visible` ring using `--border-focus` at 3px offset. Never remove focus outlines.
- **Color contrast:** all text ≥ 4.5:1, large text ≥ 3:1, non-text UI ≥ 3:1 against adjacent colors.
- **Never encode meaning in color alone.** Status pills combine color + icon + text — remove any one and it still communicates.
- **Motion respects `prefers-reduced-motion`.**
- **Zoom to 200%** must not break layouts. Use `rem` units, not `px`, for typography.
- **Screen readers:** every icon-only button has an `aria-label`. Every chart has a `<title>` and a data table fallback via `aria-describedby`.
- **Keyboard-first:** every action reachable without a mouse. `⌘K` command palette is the escape hatch.

---

## 16. Implementation Recipes

### 16.1 Button primitive

```tsx
// components/primitives/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium tabular-nums",
    "transition-[background-color,transform,box-shadow] duration-[140ms] ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-[--border-focus] focus-visible:ring-offset-[--surface-0]",
    "active:scale-[0.97]",
    "disabled:opacity-40 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary:   "bg-[--accent-primary] text-white hover:bg-[--accent-primary-hover] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        secondary: "bg-[--surface-3] text-[--text-primary] hover:bg-[--surface-4] border border-[--border-default]",
        ghost:     "bg-transparent text-[--text-primary] hover:bg-[--surface-2]",
        danger:    "bg-[--status-failed-fg] text-white hover:brightness-110",
      },
      size: {
        sm: "h-8  px-3   text-[13px] rounded-[8px]",
        md: "h-10 px-4   text-[14px] rounded-[10px]",
        lg: "h-12 px-5   text-[15px] rounded-[12px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({
  className, variant, size, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
```

### 16.2 StatusPill primitive

```tsx
// components/data/StatusPill.tsx
import { AlertTriangle, LoaderCircle, Send, Sparkles, CheckCircle2, XCircle, Clock } from "lucide-react";

const CONFIG = {
  pending:   { icon: AlertTriangle,  label: "Pending",     token: "pending" },
  progress:  { icon: LoaderCircle,   label: "In progress", token: "progress",  spin: true },
  submitted: { icon: Send,           label: "Submitted",   token: "submitted" },
  review:    { icon: Sparkles,       label: "In review",   token: "review" },
  success:   { icon: CheckCircle2,   label: "Success",     token: "success" },
  failed:    { icon: XCircle,        label: "Failed",      token: "failed" },
  expired:   { icon: Clock,          label: "Expired",     token: "expired" },
} as const;

export function StatusPill({ status }: { status: keyof typeof CONFIG }) {
  const { icon: Icon, label, token, spin } = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
      style={{
        color:           `var(--status-${token}-fg)`,
        backgroundColor: `var(--status-${token}-bg)`,
        borderColor:     `var(--status-${token}-border)`,
      }}
    >
      <Icon size={14} strokeWidth={2} className={spin ? "animate-spin [animation-duration:2s]" : ""} />
      {label}
    </span>
  );
}
```

### 16.3 Animated KPI counter

```tsx
// components/data/AnimatedNumber.tsx
"use client";
import { animate, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect } from "react";

export function AnimatedNumber({
  value, format = (n) => n.toLocaleString(), duration = 0.6,
}: { value: number; format?: (n: number) => string; duration?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (latest) => format(Math.round(latest)));
  useEffect(() => {
    const ctrl = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => ctrl.stop();
  }, [value, mv, duration]);
  return <motion.span className="tabular-nums">{display}</motion.span>;
}
```

### 16.4 Map canvas skeleton

```tsx
// components/map/MapCanvas.tsx
"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { DeckGL } from "@deck.gl/react";
import { ArcLayer } from "@deck.gl/layers";

export function MapCanvas({ routes }: { routes: Route[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map>();

  useEffect(() => {
    if (!containerRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "/styles/dark-monochrome.json",   // custom style — see §11.2
      center: [-98, 39],
      zoom: 3,
      pitch: 30,
      bearing: 0,
      projection: "globe",
      attributionControl: { compact: true },
    });
    return () => mapRef.current?.remove();
  }, []);

  const layers = [
    new ArcLayer({
      id: "routes",
      data: routes,
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getSourceColor: [110, 123, 255, 200],
      getTargetColor: [180, 123, 255, 200],
      getWidth: 2,
      widthUnits: "pixels",
      greatCircle: true,
    }),
  ];

  return (
    <div ref={containerRef} className="absolute inset-0">
      <DeckGL layers={layers} controller={false} viewState={/* synced from map */} />
    </div>
  );
}
```

---

## Final Word

The reference mockups you shared share one quality: **restraint**. They know what to leave out. A dark background does more work than any illustration. A single glowing chart is more memorable than five bright ones. A well-timed 200ms fade beats a 3-second spring animation.

Build with the assumption that the person using this interface is smart, busy, and has seen every SaaS dashboard on the internet. Respect their time, respect their attention, and give them one thing per screen worth remembering.

That's what makes it feel human.

---

*End of DESIGN.md · Maintained by the design systems team · PRs welcome.*
