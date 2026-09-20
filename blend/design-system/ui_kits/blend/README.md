# blend. UI Kit

A React recreation of the **blend.** smoothie-planner web app — designed to be lifted as-is into mockups and prototypes that need to look exactly like the real product.

## What's here

```
index.html         ← live, click-thru recreation (load this)
data.js            ← ingredients + recipes data (lifted from app)
icons.jsx          ← inline SVG glyphs
Header.jsx         ← fixed frosted header with wordmark + icon buttons + cart button
RecipeCard.jsx     ← inspiration card (color-dot or check)
PillTabs.jsx       ← horizontal pill-tab category filter
IngredientCard.jsx ← emoji + name + amount card with selected state
CartPanel.jsx      ← right-rail / bottom-sheet shopping list
SettingsModal.jsx  ← font + columns picker, sheet-up animation
ExportModal.jsx    ← share-as-text picker
App.jsx            ← composes everything; manages selection state
```

## Loading

The kit uses React 18 + Babel standalone (transpiled in-browser). All component files live in this folder. `index.html` wires them up.

## Visual fidelity notes

- Colors, type, radii, shadows, motion: **all come from `../../colors_and_type.css`**
- Mobile: the cart collapses into a bottom sheet with a green handle bar (`@media max-width: 899px`).
- The kit ships with the German copy from the live app.

## What this isn't

This is **not** a production component library. It's a pixel-faithful, lift-and-drop kit for designs.
