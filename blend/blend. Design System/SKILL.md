---
name: blend-design
description: Use this skill to generate well-branded interfaces and assets for blend. (a smoothie planner web app; English brand, ships German-first with more locales planned), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Key files

- `README.md` — full brand spec: voice, palette, type, motion, iconography, layout rules.
- `colors_and_type.css` — drop-in CSS custom properties + utility classes (`.blend-*`).
- `fonts/` — `LittleLord.ttf`, `QuirkyRobot.ttf`, `GreatVibes.ttf`.
- `ui_kits/blend/` — React recreation of the live app.
- `preview/` — small specimen cards — useful as visual reference.
- `reference/original-index.html` — the original single-file vanilla-JS app, for diffing.

## Rules of thumb

1. **Language: international brand, English is the brand language.** Today the product ships in German; more locales are planned.
2. **The wordmark IS the logo.** Always `blend.` in Playfair Display 700, lowercase, with the period.
3. **Colors:** cream paper + deep forest greens + single amber accent. No gradients. No black shadows.
4. **Iconography:** hand-rolled inline SVGs, stroke 2, `currentColor`. Emoji = ingredients only.
5. **Cards:** white surface, soft green-tinted shadow, rounded 14–22px, never a colored left border.
6. **Motion:** sheets and the cart-panel use `cubic-bezier(0.32, 0.72, 0, 1)`. Most other motion is plain `ease`, 130–280ms.
7. **No imagery** unless explicitly requested.

## Quick start

```html
<link rel="stylesheet" href="colors_and_type.css">
<header class="blend-header">
  <a class="blend-wordmark" href="#">blend.</a>
</header>
<button class="blend-btn blend-btn-primary">Einkaufszettel teilen</button>
<button class="blend-pill-tab active">Alle</button>
```
