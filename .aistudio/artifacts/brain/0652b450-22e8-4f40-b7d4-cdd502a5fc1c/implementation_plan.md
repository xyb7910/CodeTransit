# Yanpb CodeTransit Implementation Plan

Yanpb CodeTransit extends the open-source Carbon code-beautification studio into an integrated competitive programming and informatics coaching workspace. Built locally-first in Vite, React, TypeScript, and Express with Carbon's MIT-licensed core aesthetic preserved, it lets competitors and coaches compose modular study/teaching canvases, annotate problem statements and source code non-destructively, compare test samples, export print- and slide-ready graphics across eight templates, transfer code or full workspaces via server-backed 6-digit pickup codes, and curate a versioned algorithm repository.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices were confirmed during Phase 1 clarification and govern the full build across Phases 1–5.

- **Confirmed Decision 1 — Hybrid Local-First & Express Backend Persistence**: Client drafts, problem highlights, code annotations, version history, and personal template/problem libraries persist immediately in browser IndexedDB for zero-latency offline use. Server-generated 6-digit pickup codes, expiration timers, access limits, burn-after-reading states, password verification, and cloud workspace snapshots run on the built-in Express API backed by a structured server-side JSON/SQLite-compatible store.
- **Confirmed Decision 2 — Carbon Core Port in Vite + Express**: Rather than wrapping an external Next.js build, Carbon's core editing, syntax themes, window chrome styles, typography, background gradients, shadows, padding, and high-DPI image export pipeline are cleanly implemented inside the current Vite + React + Express workspace while preserving Carbon's MIT License and copyright attribution.
- **Confirmed Decision 3 — Simplified Chinese Default with CN/EN Switcher & Dark Mode Default**: The studio launches in Dark mode with Simplified Chinese UI copy and provides an instant CN/EN language toggle alongside a synchronized Dark/Light theme switch (`@custom-variant dark`).
- **Confirmed Decision 4 — Full Phases 1–5 Integrated Delivery**: The implementation delivers the Carbon Classic canvas, Modular Block Canvas, Problem & Code Annotation engines, Sample Diff Comparator, 8-Template Export Studio, CodeTransit 6-Digit Hub with QR codes, and the Competitive Algorithm & Problem Repository in one cohesive release.

---

## 1. Overview & Core Concept

- **What It Does**: Yanpb CodeTransit opens directly in a clean **Carbon Classic** central code studio—preserving Carbon's signature syntax-highlighted window floating on a customizable backdrop—and expands on demand into a drag-and-drop **Block Canvas** tailored for algorithm education and contest workflows. Users can import problem statements, highlight key constraints in six semantic colors, pin teaching callouts onto code lines without altering copyable source code, compare sample outputs with token/float-tolerant diffs, export multi-template PNG/SVG/JPEG graphics or paginated A4 handouts, share snippets or entire workspaces via 6-digit pickup codes and QR cards, and manage C++17 (and polyglot) algorithm templates with version diffs.
- **Target Audience / Persona**: Informatics Olympiad coaches (CSP-J / CSP-S / NOIP), ICPC/CCPC collegiate competitors, and technical algorithm bloggers preparing lecture slides, debugging explanations, or cross-device code transfers during lab sessions.
- **Key Value**: Eliminates juggling separate Markdown editors, Carbon screenshot tabs, diff tools, and temporary pastebins by unifying code presentation, non-destructive pedagogical markup, and instant 6-digit transit in one distraction-free canvas.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Zero-State Entry (Carbon Classic Mode)**:
   - User lands directly on the centered Carbon studio canvas displaying a clean C++17 algorithm snippet inside a macOS-framed window on a curated dark slate/gradient backdrop, paired with a collapsible Carbon styling toolbar (theme, language, window chrome, font, padding, shadow, background).
   - No login wall blocks editing; local IndexedDB auto-saves drafts silently.
2. **Expanding into a Modular Block Canvas**:
   - Clicking **Add Block** (or selecting one of 8 preset Templates such as *Contest Mode*, *Teaching Mode*, *Solution Mode*, or *A4 Notes*) expands the central canvas with drag-and-drop blocks: Title, Problem Description, Problem Keypoints, Code, Sample Groups, Math Formula, Solution Approach, Complexity, Teaching Annotation, and Author Signature (`Yanpb`).
   - Users reorder blocks via drag handles, toggle visibility, duplicate, or adjust global vs. per-block styling.
3. **Problem Import & Six-Color Selection Highlighting**:
   - Users paste Markdown, import `.md`/`.json` files, or use an extensible OJ parser adapter (supporting Luogu/Codeforces/AtCoder structured blocks).
   - Highlighting text in the Problem block triggers a floating annotation popover offering 6 semantic colors (Yellow: Key Condition, Green: Data Scale, Blue: Breakthrough, Red: Pitfall, Purple: Formula/State, Orange: Key Sample), underline, inline note, Undo/Redo, and a "Highlights-Only" study view.
   - If the problem text is edited afterward, an anchor-relocation engine attempts exact and fuzzy context matching and clearly flags unanchored highlights for user review instead of silently misattaching them.
4. **Non-Destructive Code Highlighting & Sample Diffs**:
   - Selecting lines or character ranges in the Code block attaches independent line highlights, dimmed-focus regions, multi-line boxes, directional callout arrows, explanation bubbles, and teaching sections. Copying raw code or exporting clean code strips all markup; line shifts from edits automatically re-map or flag affected annotations.
   - Sample blocks support Official, Boundary, Custom, Random, and Error test cases with side-by-side/stacked layouts, char/line/token/epsilon-float diff highlighting, and batch import/export.
5. **High-Fidelity Export, CodeTransit & Repository**:
   - **Export Modal**: Live WYSIWYG preview of selected blocks or full template, choosing PNG/SVG/JPEG, 1x–4x scale, transparent background, custom width, A4 ratio, or long-image pagination.
   - **CodeTransit Drawer/Modal**: Generates a server-verified 6-digit pickup code, direct link, and offline-rendered SVG QR code for either raw source code or the complete workspace, with configurable TTL, password lock, max view count, burn-after-reading, and read-only mode.
   - **Algorithm & Problem Repository Drawer**: Filterable by contest tier (`CSP-J`, `CSP-S`, `NOIP`, `ACM`) and 10 algorithmic domains, with star ratings, favorites, version snapshots, line-by-line diff viewer, JSON workspace backup, and batch source download.

### Visual Identity & Theme

- **Aesthetic Direction**: Minimalist, high-craft developer studio inspired directly by Carbon's focused canvas—atmospheric deep dark slate default with crisp light-mode parity, disciplined single-elevation surfaces, and zero visual clutter or dashboard bloat.
- **Top Bar Contract (Three-Zone Header)**:
  - *Zone 1 (Left)*: Single-line brand wordmark `Yanpb CodeTransit` (`whitespace-nowrap shrink-0`).
  - *Zone 2 (Center)*: 4 concise single-line navigation triggers (`Canvas`, `Templates`, `Transit`, `Repository` — localized in CN/EN).
  - *Zone 3 (Right)*: Single primary CTA button (`Export Image`), keeping secondary utilities (theme toggle, CN/EN switch, keyboard shortcuts) cleanly inside the canvas toolbar below the header.
- **Color Palette & Dual-Theme Parity**:
  - **60% Neutral Canvas**: Dark default `#0B0E14` / `#11151E` (`--bg-canvas`) and crisp Light `#F8FAFC` / `#FFFFFF`, paired with `@custom-variant dark` so every surface, input, border, and text token switches cleanly without contrast inversion bugs.
  - **30% Structural Surfaces**: Hairline `1px` borders (`rgba(255,255,255,0.08)` dark / `#E2E8F0` light) and subtle surface contrast (`#151A24` dark / `#F1F5F9` light) — no nested card boxes or thick left accent bars.
  - **10% Accent Budget**: Sharp cobalt/indigo primary action accent (`#3B82F6` / `#2563EB`) reserved strictly for primary CTAs, active template tabs, and focus rings; semantic green/amber/crimson restricted to sample diff states and validation feedback with explicit text labels.
- **Typography & Hierarchy**:
  - **Display & Headings**: `Plus Jakarta Sans` paired with `Noto Sans SC` for sharp CJK rendering (`text-wrap: balance`).
  - **Body & UI Controls**: `DM Sans` / `Plus Jakarta Sans` (`13px–15px`) with `whitespace-nowrap shrink-0` on all buttons and tabs.
  - **Code & Tabular Metrics**: `JetBrains Mono` (plus user-selectable Carbon fonts: `Fira Code`, `Hack`, `Source Code Pro`, `IBM Plex Mono`, `Inconsolata`) with `font-variant-numeric: tabular-nums` for line numbers, complexity bounds, sample diff lines, and pickup codes.
- **Zero-Pill & Anti-Slop Discipline**: Static metadata (difficulty, OJ platform, language, timestamps, counts) renders as clean unboxed text separated by `·` or `/`, avoiding pill-badge clutter, decorative pulsing dots, or fake telemetry tickers.
- **Interactive Feedback & Motion**: Micro-interactions (toolbar popovers, block drag settling, modal transitions) use GPU-composited `transform`/`opacity` transitions settling within `150ms–200ms` and respect `prefers-reduced-motion`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Client-Side Canvas Rendering + Direct SVG/PNG Pipeline**:
  - *Chosen Approach*: Build a dedicated high-DPI DOM-to-image export renderer (`html-to-image` / SVG foreignObject with embedded KaTeX & Google/local font styles) paired with a live scaled preview container.
  - *Why*: Ensures 100% visual parity between what the user sees on the canvas (including Chinese fonts, KaTeX formulas, Carbon themes, and code annotations) and exported PNG/SVG/JPEG files, including multi-page A4 slicing.
  - *Alternatives Considered*: Server-side headless browser rendering (adds heavy runtime latency and breaks offline-first capability).
- **Decision 2 — Non-Destructive Anchor-Tracked Annotations**:
  - *Chosen Approach*: Store problem highlights (`startOffset`, `endOffset`, `exactText`, `prefixContext`, `suffixContext`) and code annotations (`lineFingerprint`, `lineNumber`, `colStart`, `colEnd`) separately from raw text/code.
  - *Why*: Guarantees raw code copy and clean export remain unpolluted while intelligently re-anchoring highlights when edits shift text or lines—and explicitly surfacing orphaned annotations when text changes incompatibly.
  - *Alternatives Considered*: Embedding inline HTML/Markdown span tags inside source text (corrupts copyable code and breaks syntax highlighting).
- **Decision 3 — Custom Express Transit Store with File-Backed Persistence**:
  - *Chosen Approach*: Run an Express `/api/transit/*` and `/api/cloud/*` backend storing records in a hardened local server data file (`data/transit-store.json` with atomic writes and startup cleanup of expired entries), paired with client IndexedDB.
  - *Why*: Zero external database credentials needed in preview or self-hosted deployments while delivering genuine server-side 6-digit code uniqueness, cryptographic password hashing (`scrypt`), rate limiting, and burn-after-reading enforcement.
  - *Alternatives Considered*: External Supabase or Cloud SQL (rejected per Phase 1 user preference for zero-setup built-in Express store).
- **Decision 4 — Safe Markdown + KaTeX Rendering Pipeline**:
  - *Chosen Approach*: Parse Markdown and LaTeX (`$...$`, `$$...$$`) using `marked` + `katex` sanitized strictly via `DOMPurify`, restricting URLs to safe `http:`/`https:` schemes.
  - *Why*: Eliminates script-injection risks when importing third-party OJ problems or opening shared workspaces via 6-digit transit codes.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Browser Client (React + Vite)                     │
│                                                                           │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │   Carbon Core &      │   │        Modular Block Canvas (dnd-kit)    │  │
│  │   Style Controller   │──▶│  Title │ Problem │ Code │ Samples │ Math │  │
│  │  (Themes, Chrome,    │   │  Solution │ Complexity │ Notes │ Author  │  │
│  │   Fonts, Templates)  │   └────────────────────┬─────────────────────┘  │
│  └──────────────────────┘                        │                        │
│            │                                     ▼                        │
│  ┌─────────┴────────────┐   ┌──────────────────────────────────────────┐  │
│  │  Annotation Engines  │   │     Export & Diff & Repository Engines   │  │
│  │ • 6-Color Problem    │   │ • 8 Templates + A4/Long-Image Pagination │  │
│  │   Context Anchoring  │   │ • Sample Char/Line/Token/Float Diffs     │  │
│  │ • Code Line/Range &  │   │ • Version Snapshots & Line Diffs         │  │
│  │   Arrow Callouts     │   └────────────────────┬─────────────────────┘  │
│  └─────────┬────────────┘                        │                        │
│            └──────────────────┬──────────────────┘                        │
│                               ▼                                           │
│                  IndexedDB Local-First Persistence                        │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ HTTPS / REST (/api/*)
┌───────────────────────────────▼───────────────────────────────────────────┐
│                      Express Server (Port 3000)                           │
│                                                                           │
│  ┌──────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │  CodeTransit API     │   │  Security & Storage Layer                │  │
│  │ • POST /api/transit  │   │ • Unique 6-digit code generator          │  │
│  │ • GET  /api/transit/ │──▶│ • Server-side scrypt password hashing    │  │
│  │   :code              │   │ • Per-IP rate limiter & TTL sweep        │  │
│  │ • POST /api/transit/ │   │ • Burn-after-reading atomic deletion     │  │
│  │   :code/verify       │   │ • Cloud workspace snapshot sync          │  │
│  └──────────────────────┘   └──────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models & State Stores

- **Workspace Document**: Holds `id`, `title`, `templatePreset` (8 modes), `canvasTheme` (Carbon syntax theme, window chrome, background, padding, shadow, font, line-height, watermark, author config), ordered `blocks[]` with per-block visibility/collapse/style overrides, and `updatedAt`.
- **Problem & Highlight State**: Stores problem metadata (`title`, `code`, `platform`, `url`, `difficulty`, `tags[]`, `starred`), structured Markdown+LaTeX sections (`description`, `inputFormat`, `outputFormat`, `constraints`), and `highlights[]` (color category, anchor offsets, surrounding text context, note, `status: 'anchored' | 'orphaned'`).
- **Code & Annotation State**: Stores raw `code` string, `language` (default `cpp17`), and `annotations[]` (`id`, `type: 'line' | 'range' | 'box' | 'dim' | 'arrow' | 'note' | 'section'`, start/end line & column, line content fingerprint, label, color, `status: 'anchored' | 'orphaned'`).
- **Sample Group State**: Repeatable array of test samples (`id`, `name`, `type: 'official' | 'boundary' | 'custom' | 'random' | 'error'`, `input`, `expectedOutput`, `actualOutput`, `explanation`, `layout: 'split' | 'stacked'`, `diffMode: 'line' | 'char' | 'token' | 'float'`, `epsilon`).
- **Repository & Version History**: IndexedDB collections for algorithm templates and problem bookmarks tagged by tier (`CSP-J`, `CSP-S`, `NOIP`, `ACM`), domain category (10 categories), template variant (`standard`, `variant`, `classic`), and immutable workspace snapshots for diff comparison.
- **Transit Record (Server-Side)**: Holds `code` (6-digit string), `payloadType: 'source' | 'workspace'`, sanitized `payload`, `readOnly`, `passwordHash` (nullable salted `scrypt`), `maxViews`, `viewsUsed`, `burnAfterRead`, `expiresAt`, and `createdAt`.

### Interactive Component & State Mapping

- **Top Toolbar & Template Switcher**: Selecting a template preset (e.g., *Carbon Classic* vs. *Teaching Mode*) updates active block composition and layout presets non-destructively while keeping user content intact.
- **Block Canvas & Drag Handles (`dnd-kit`)**: Dragging updates block order in state and commits to IndexedDB; per-block action menus trigger duplicate, collapse, hide/show, style override, or delete with undo support.
- **Problem Selection Popover**: `onMouseUp` inside Problem Markdown calculates DOM text-node character offsets relative to raw Markdown/rendered text, displays the 6-color floating toolbar at selection bounds, and dispatches highlight creation with undo/redo stack support.
- **Code Editor & Annotation Gutter**: CodeMirror 6 editor handles syntax highlighting, line numbers, and C++17/multi-language editing; an annotation overlay layer renders line tints, focus dimming, multi-line boxes, arrows, and margin callout bubbles synchronized with scroll and line-height metrics.
- **Export Preview & Generator**: Clones the selected canvas blocks into a clean export staging frame with explicit dimensions (auto, custom width, A4, or paginated slices), runs live preview scaling, and invokes PNG/SVG/JPEG export at 1x–4x pixel ratio.
- **CodeTransit Modal & Verification Flow**: Submitting a share bundle calls `POST /api/transit` and receives a 6-digit code + QR matrix; retrieving a code checks TTL/rate limits (`GET /api/transit/:code`), prompts for password verification (`POST /api/transit/:code/verify`) if locked, increments view counter / burns on read, and loads the workspace or raw code cleanly into the studio.

### Verified Security Safeguards

- All user-imported Markdown, OJ problem statements, and shared transit payloads pass through strict HTML sanitization and URL scheme validation before rendering, preventing script injection across shared links.
- Optional transit passwords are salted and hashed exclusively on the server using Node's `scrypt`, and protected transit records never leak payload content prior to password verification.
- Server transit routes enforce per-IP rate limiting, strict payload size/schema validation, atomic view-counter/burn-after-reading enforcement, and non-public default isolation for personal cloud snapshots.
