---
name: Criterium Analytics
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45474c'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#330009'
  on-tertiary: '#ffffff'
  tertiary-container: '#590016'
  on-tertiary-container: '#ff4e69'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
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
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
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
  data-mono:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
---

## Brand & Style
The design system is engineered for high-density data synthesis and authoritative reporting. It prioritizes clarity, performance, and trust, reflecting the critical nature of public safety data. The aesthetic is **Corporate Modern** with a technical edge, utilizing heavy whitespace to balance complex datasets.

The interface must evoke an emotional response of security and analytical precision. It avoids decorative flourishes in favor of functional aesthetics: crisp lines, purposeful grouping, and a systematic approach to information hierarchy.

## Colors
The palette is rooted in deep slates and navies to establish a foundation of professional reliability. 

- **Primary:** Deep Slate (#1E293B) is used for structural navigation, headers, and primary text to ensure maximum legibility and authority.
- **Secondary:** Professional Blue (#3B82F6) serves as the primary action color for interactive UI elements.
- **Alert Spectrum:** A critical range of intensity colors (Crimson to Amber) is reserved strictly for heatmaps, trend indicators, and severity metrics.
- **Surface:** The background utilizes a clean, "off-white" slate to reduce eye strain during prolonged analysis, with subtle gray borders (#E2E8F0) for sectional containment.

## Typography
This design system utilizes **Manrope** across all roles to maintain a unified, technical appearance. Its geometric yet approachable nature ensures that even dense tables remain readable.

For data-heavy displays, enable **tabular numerals** (tnum) to ensure numbers align vertically in columns, facilitating easier comparison of statistics. Headlines should use tighter letter spacing to maintain a "locked-in" professional feel, while labels utilize uppercase tracking for clear categorization.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a 12-column structure for desktop and a 4-column structure for mobile. 

- **Logic:** A strict 4px base unit controls all padding and margins. 
- **Density:** High-density layouts are preferred for analytical views. Use 16px gutters between data cards to maximize screen real estate while maintaining separation.
- **Responsive Behavior:** On tablet, the sidebar collapses into a rail. On mobile, charts reflow to a single-column vertical stack with 16px horizontal margins.

## Elevation & Depth
Depth is communicated through **Tonal Layering** supplemented by extremely soft, diffused shadows. 

- **Level 0 (Background):** Slate-50 (#F8FAFC) used for the main canvas.
- **Level 1 (Cards):** Pure White (#FFFFFF) with a 1px border (#E2E8F0). This is the primary surface for data visualizations.
- **Shadows:** Use a "Natural Ambient" shadow: `0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)`.
- **Active States:** Elements being interacted with or dragged should use a slightly more pronounced shadow to indicate lift.

## Shapes
The shape language balances the rigid nature of data with modern accessibility.

- **Standard Containers:** Cards and large containers use a `12px` (0.75rem) radius.
- **Interactive Elements:** Buttons and input fields use a `8px` (0.5rem) radius to feel precise.
- **Data Markers:** Small data points in charts (line nodes) should be circular to stand out against the angular grid lines of the charts.

## Components
- **Data Cards:** Every metric must be contained within a card. Cards should include a `label-md` header and a `headline-lg` value.
- **Buttons:** Primary buttons use `primary_color_hex` with white text. Ghost buttons (border only) are used for secondary filtering actions.
- **Inputs:** Search and filter bars must have a subtle `1px` border. Active states use a `2px` focus ring in `secondary_color_hex`.
- **Data Visualization:** 
    - **Line Charts:** Use a 2px stroke width.
    - **Heatmaps:** Use a 5-step sequential color scale from Yellow (low) to Deep Red (high).
    - **Tooltips:** Use `primary_color_hex` for the background with 90% opacity and `body-md` white text.
- **Status Chips:** Small, rounded-pill indicators used for trend percentages (e.g., "+12%"). Use low-saturation green/red backgrounds with high-saturation text for legibility.