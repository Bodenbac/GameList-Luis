# blend. Design System

A calm, editorial-feeling design system for **blend.**, a German-language smoothie planner web app that helps you pick ingredients across recipes and export a unified shopping list.

The brand sits at the intersection of "minimal kitchen journal" and "modern produce-aisle UI": cream backgrounds, deep forest greens, warm amber accents, a serif wordmark with a confident lowercase period, and one big content surface where ingredient cards do all the talking.

---

## Sources

This design system was reverse-engineered from the live codebase:

- **Codebase (local):** `SmoothiePlanner/` (attached folder)
  - Single-file web app: `SmoothiePlanner/index.html` (about 1550 lines, vanilla JS, no build step)
  - Custom TTF fonts: `SmoothiePlanner/Fonts/{GreatVibes, LittleLord, QuirkyRobot}.ttf`
- **GitHub remote:** `Bodenbac/GameList-Luis`, branch `main`, path `blend/index.html`
- A snapshot of the original page lives at `reference/original-index.html` for diffing.

No Figma, no slide deck, no marketing site. There is one product, one HTML file, one feeling.

---

## Index

```
README.md                  you are here
SKILL.md                   agent skill manifest (Claude Code compatible)
colors_and_type.css        CSS custom properties: palette, semantic vars, type scale
fonts/                     LittleLord.ttf, QuirkyRobot.ttf, GreatVibes.ttf
reference/                 original index.html (read-only snapshot)
preview/                   Design-System-tab specimen cards
ui_kits/blend/             React recreation of the app (index.html + JSX components)
```

---

## Product Context

**blend.** is a single-page tool with three regions:

1. **Inspiration strip.** Preset smoothie recipes as small cards with a color dot and the ingredient list. Tap to toggle the whole recipe.
2. **Ingredient workspace.** A pill-tab category filter, then a responsive grid of ingredient cards (emoji + name + amount).
3. **Einkaufszettel (shopping list).** Sticky right panel on desktop; bottom-sheet drawer on mobile.

Everything is local state and `localStorage`. No accounts, no backend, no analytics, no images. Emoji do the entire job of imagery.

The settings sheet lets users swap between four typographic personalities and choose 1, 2, or 3 column recipe layout on mobile.

---

## Content Fundamentals

**Language:** The product is built as an **international brand**. **English is the brand language** (wordmark, internal docs, naming). The product ships **German first** today, with additional locales planned.

**Voice:** Warm, calm, unfussy. Sentences are short.

**Wordmark:** Always `blend.` — lowercase, with trailing period, in Playfair Display 700. Never localize, never capitalize.

---

## Visual Foundations

### Palette

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#F7F4EF` | Page background ("paper") |
| `--bg-surface` | `#FFFFFF` | Cards, modal sheets |
| `--bg-muted` | `#EEE9E1` | Inactive tabs, icon-button backgrounds |
| `--green-700` | `#2C5441` | Primary buttons, active tab, cart icon |
| `--amber-500` | `#E07B39` | Cart badge |

### Typography

Two type systems: **Classic** (Playfair Display + DM Sans from Google Fonts) and three switchable themes (LittleLord, QuirkyRobot, GreatVibes — local TTFs).

### Motion

- Sheets/cart: `cubic-bezier(0.32, 0.72, 0, 1)`
- Everything else: `ease`, 130–280ms

### Cards

- White surface, green-tinted shadow, border-radius 14–22px
- Never a colored left-border accent

---

## Quick start for an agent

```
1. Load colors_and_type.css into your design's <head>.
2. Pull Playfair Display and DM Sans from Google Fonts.
3. Use the .blend-card-recipe / .blend-card-ingredient / .blend-btn-* classes.
4. For German copy, mirror the existing tone: short, declarative, no exclamations.
5. Use emoji for ingredient/food imagery; never use SVG illustrations.
```

See `ui_kits/blend/` for live React components you can lift directly.
