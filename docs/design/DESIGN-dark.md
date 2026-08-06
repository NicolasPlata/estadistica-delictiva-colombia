---
name: Criterium Analytics Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#ffbcbf'
  on-tertiary: '#67001b'
  tertiary-container: '#ff929a'
  on-tertiary-container: '#8c0028'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system embodies a technical, high-performance, and authoritative personality tailored for data-driven decision-making. It adopts a **Modern Corporate** aesthetic with a strong emphasis on information density and visual precision.

The style utilizes a deep slate palette to minimize eye strain during long-duration analytical sessions. It relies on crisp geometry, purposeful whitespace, and subtle tonal layering to establish a clear information hierarchy without the need for excessive decorative elements. The emotional response is one of calm control, reliability, and sophisticated technical capability.

## Colors
The palette is centered on a "Deep Slate" foundation. The primary accent is a high-vibrancy Blue (`#38bdf8`), optimized for luminosity against dark backgrounds to ensure interactive elements remain discoverable.

**Functional Color Application:**
- **Backgrounds:** Use `#0f172a` for the primary canvas and `#1e293b` for structural sidebars or headers.
- **Surfaces:** Cards and floating panels utilize `#334155` to create distinct elevation.
- **Risk Mapping:** Status indicators and heatmaps utilize a high-contrast scale from Deep Rose (`#f43f5e`) for high density to Emerald (`#22c55e`) for low density. These colors are calibrated for high saturation to "pop" against the charcoal environment.

## Typography
Manrope is the sole typeface, chosen for its modern, geometric construction and excellent legibility in technical interfaces.

- **Contrast:** Headings use Pure White (`#ffffff`) to command attention. Body copy uses Light Grey (`#cbd5e1`) to maintain readability while reducing glare.
- **Data Display:** Numerical data in tables or dashboards should use `fontWeight: 600` to ensure visual weight.
- **Labels:** Use the `label-md` style for chart axes, small metadata, and category headers to provide clear structural scaffolding.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a strictly enforced 4px baseline shift. This ensures technical data tables and complex dashboards remain aligned and scannable.

- **Desktop:** 12-column grid, 24px margins, 16px gutters. Panels are often "docked" to the edges to maximize the map/data visualization area.
- **Mobile:** 4-column grid, 16px margins. Complex data tables should transition to card-based layouts or horizontal-scroll views.
- **Density:** This design system favors "Comfortable" density for general navigation but "Compact" density (8px padding) for data-heavy analytical panels.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than traditional shadows. In a dark environment, light sources are represented by subtle border highlights and surface color shifts.

- **Level 0 (Base):** `#0f172a` — The main background.
- **Level 1 (Panels):** `#1e293b` — Used for side navigation and secondary toolbars.
- **Level 2 (Cards):** `#334155` — Used for floating analytical modules.
- **Interactions:** Hover states on interactive elements should use a subtle inner glow or a 1px border of `#475569` to define the object's boundaries against the dark background.

## Shapes
The shape language is **Soft** and disciplined. A 4px (0.25rem) corner radius is the standard for most UI components (buttons, inputs, cards), providing a modern feel while maintaining the "serious" architectural look required for an analytics platform.

- **Inputs & Buttons:** 4px radius.
- **Modals & Large Panels:** 8px (0.5rem) radius for a distinct "object" feel.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from functional buttons.

## Components
- **Buttons:** Primary buttons use a solid Blue (`#38bdf8`) with Dark Navy text. Secondary buttons use a transparent background with a 1px slate border.
- **Input Fields:** Backgrounds are `#0f172a` with a 1px border of `#475569`. On focus, the border shifts to the primary blue with a subtle outer glow.
- **Cards:** Use `#334155` as the surface color. Card headers should have a subtle bottom divider of `#475569`.
- **Data Tables:** Row stripes are not used. Instead, use a subtle hover state highlight of `#3e4e63`. Column headers use `label-md` typography.
- **Risk Indicators:** Use high-saturation circles or "dots" for map markers. When representing risk density, use a gradient ramp from `#f43f5e` (High) to `#22c55e` (Low) with a 60% opacity fill to allow the underlying map details to remain visible.
- **Chips/Badges:** Use a low-opacity background tint of the status color (e.g., Red at 15% opacity) with a fully opaque text label to ensure readability in dark mode.