    # Hiro Mobile App — Design System

> Sources: [Figma · Typeface](https://www.figma.com/design/lwCxPN88s2dNHApTeWuoB0/Hiro-Mobile-App?node-id=169-1246) · [Figma · Color Palette](https://www.figma.com/design/lwCxPN88s2dNHApTeWuoB0/Hiro-Mobile-App?node-id=169-4010) · [Figma · Spacing & Radius](https://www.figma.com/design/lwCxPN88s2dNHApTeWuoB0/Hiro-Mobile-App?node-id=169-4012) · [Figma · Drop Shadow](https://www.figma.com/design/lwCxPN88s2dNHApTeWuoB0/Hiro-Mobile-App?node-id=169-4013) · [Figma · Components](https://www.figma.com/design/lwCxPN88s2dNHApTeWuoB0/Hiro-Mobile-App?node-id=168-2563)
>
> **Last synced:** 2026-07-02 (v7) — Design System page audit + Typeface rescan + Logo update. Fix: shadow-xsl (was shadow-xxl); Bottom Navigation description corrected to 5 destinations; line height updated to Auto for all styles. Added: Caption 02 (10px) Poppins style; full Logo & Brand Assets spec (color variants, layout variants, background contexts, usage guidelines). — Full visual audit of all component + typography pages. Fixes: Bottom Navigation now 5 tabs (added Inbox); Header Variant2 = more_vert; Stepper supports /4 /5 /6 /7 totals. Added: Radio Button card variants (Plan, Personality, Voice); Dropdown open state + Timezone variant; Search suggestion dropdown; Contact Row alphabetical divider; Checkbox Task Row timestamp; Other Icons — Onboarding Illustrations + 3D Icons library. — Full variable API scan (var-set-id 41:18691). All color, spacing, radius, typography, and semantic tokens cross-verified against Figma Variables panel. Added missing `Spacing and Radius/Radius/Radius-minimal-200` = 8px alias. All other tokens confirmed accurate. Note: surface subtler tokens (`surface-brand - subtler`, `surface-error-subtle/subtler`, `surface-sucess-subtler`, `surface-Info-subtler`) are defined as component-level styles, not top-level variables — they are correctly documented from visual inspection.

---

## Typography

Two font families are used across the app. All styles share **Letter Spacing: 0%** and **Line Height: Auto**.

### Poppins — UI & Content

Used for all general UI text: headings, body copy, labels, captions, and navigation.

| Token | Size | Weights available | Usage |
|---|---|---|---|
| Heading 01 | 32px | 400 · 500 · 600 · 700 | Hero headlines, onboarding screens, welcome messages, empty state highlights |
| Heading 02 | 28px | 400 · 500 · 600 · 700 | Main screen titles, dashboard headings, major page titles |
| Heading 03 | 24px | 400 · 500 · 600 · 700 | Section headers, modal titles, feature titles |
| Sub Heading 01 | 20px | 400 · 500 · 600 · 700 | Card titles, subsection headers, important content headings |
| Sub Heading 02 | 18px | 400 · 500 · 600 · 700 | List titles, content titles, form section titles |
| Body - Label 01 | 16px | 400 · 500 · 600 · 700 | Primary body text, input text, button text (large) |
| Body - Label 02 | 14px | 400 · 500 · 600 · 700 | Labels, secondary content, helper text, tabs, navigation labels, button text (medium), error text |
| Caption 01 | 12px | 400 · 500 · 600 · 700 | Captions, timestamps, metadata, supporting information, status text, button text (small) |
| Caption 02 | 10px | 400 · 500 · 600 · 700 | Captions, timestamps, metadata, supporting information, status text, button text (extra-small) |

### Roboto Mono — Technical & Machine-generated Values

Used for machine-generated, technical, security-sensitive, or copyable values such as verification codes, IDs, API keys, and error codes.

| Token | Size | Weights available | Usage |
|---|---|---|---|
| OTP 01 | 24px | 400 · 500 · 600 · 700 | OTP / verification codes |
| OTP 02 | 20px | 400 · 500 · 600 · 700 | OTP / verification codes (secondary) |
| CODE 01 | 18px | 400 · 500 · 600 · 700 | OTP / verification codes (smaller) |
| CODE 02 | 16px | 400 · 500 · 600 · 700 | Recovery codes, error codes, call/webhook IDs |
| KEY 01 | 14px | 400 · 500 · 600 · 700 | API keys, environment variables |
| META 01 | 12px | 400 · 500 · 600 · 700 | Debug labels, technical metadata |

---

## Color Palette

### Brand Color

| Swatch | Token | Hex |
|---|---|---|
| 5 | `Colors/Brand Color/5` | `#fbfdff` |
| 25 | `Colors/Brand Color/25` | `#edf3fa` |
| 50 | `Colors/Brand Color/50` | `#e6eaf2` |
| 100 | `Colors/Brand Color/100` | `#b0bcd6` |
| 200 | `Colors/Brand Color/200` | `#8a9cc2` |
| 300 | `Colors/Brand Color/300` | `#546fa6` |
| 400 | `Colors/Brand Color/400` | `#335395` |
| **500** | `Colors/Brand Color/500` | **`#00287a`** |
| 600 | `Colors/Brand Color/600` | `#00246f` |
| 700 | `Colors/Brand Color/700` | `#001c57` |
| 800 | `Colors/Brand Color/800` | `#001643` |
| 900 | `Colors/Brand Color/900` | `#001133` |

### Secondary Color

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Secondary Color/50` | `#e7eefb` |
| 100 | `Colors/Secondary Color/100` | `#b5ccf1` |
| 200 | `Colors/Secondary Color/200` | `#91b3ea` |
| 300 | `Colors/Secondary Color/300` | `#5f90e1` |
| 400 | `Colors/Secondary Color/400` | `#407adb` |
| **500** | `Colors/Secondary Color/500` | **`#1059d2`** |
| 600 | `Colors/Secondary Color/600` | `#0f51bf` |
| 700 | `Colors/Secondary Color/700` | `#0b3f95` |
| 800 | `Colors/Secondary Color/800` | `#093174` |
| 900 | `Colors/Secondary Color/900` | `#072558` |

### Accent Color

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Accent Color/50` | `#f3effe` |
| 100 | `Colors/Accent Color/100` | `#dbccfc` |
| 200 | `Colors/Accent Color/200` | `#cab4fb` |
| 300 | `Colors/Accent Color/300` | `#b192f9` |
| 400 | `Colors/Accent Color/400` | `#a27df8` |
| **500** | `Colors/Accent Color/500` | **`#8b5cf6`** |
| 600 | `Colors/Accent Color/600` | `#7e54e0` |
| 700 | `Colors/Accent Color/700` | `#6341af` |
| 800 | `Colors/Accent Color/800` | `#4c3387` |
| 900 | `Colors/Accent Color/900` | `#3a2767` |

### Danger Color

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Danger Color/50` | `#fbeaea` |
| 100 | `Colors/Danger Color/100` | `#f2bdbd` |
| 200 | `Colors/Danger Color/200` | `#ec9d9d` |
| 300 | `Colors/Danger Color/300` | `#e47171` |
| 400 | `Colors/Danger Color/400` | `#de5555` |
| **500** | `Colors/Danger Color/500` | **`#d62b2b`** |
| 600 | `Colors/Danger Color/600` | `#c32727` |
| 700 | `Colors/Danger Color/700` | `#981f1f` |
| 800 | `Colors/Danger Color/800` | `#761818` |
| 900 | `Colors/Danger Color/900` | `#5a1212` |

### Warning Color

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Warning Color/50` | `#fffbea` |
| 100 | `Colors/Warning Color/100` | `#fdf2bc` |
| 200 | `Colors/Warning Color/200` | `#fdeb9c` |
| 300 | `Colors/Warning Color/300` | `#fce26f` |
| 400 | `Colors/Warning Color/400` | `#fbdd53` |
| **500** | `Colors/Warning Color/500` | **`#fad428`** |
| 600 | `Colors/Warning Color/600` | `#e4c124` |
| 700 | `Colors/Warning Color/700` | `#b2971c` |
| 800 | `Colors/Warning Color/800` | `#8a7516` |
| 900 | `Colors/Warning Color/900` | `#695911` |

### Success Color

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Success Color/50` | `#e7f6ee` |
| 100 | `Colors/Success Color/100` | `#b3e4c9` |
| 200 | `Colors/Success Color/200` | `#8ed7af` |
| 300 | `Colors/Success Color/300` | `#5bc48a` |
| 400 | `Colors/Success Color/400` | `#3bb974` |
| **500** | `Colors/Success Color/500` | **`#0aa751`** |
| 600 | `Colors/Success Color/600` | `#09984a` |
| 700 | `Colors/Success Color/700` | `#07773a` |
| 800 | `Colors/Success Color/800` | `#065c2d` |
| 900 | `Colors/Success Color/900` | `#044622` |

### Light Neutral

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Light Neutral/50` | `#f6f6f6` |
| 100 | `Colors/Light Neutral/100` | `#e3e3e3` |
| 200 | `Colors/Light Neutral/200` | `#d6d6d6` |
| 300 | `Colors/Light Neutral/300` | `#c3c3c3` |
| 400 | `Colors/Light Neutral/400` | `#b8b8b8` |
| 500 | `Colors/Light Neutral/500` | `#a6a6a6` |
| 600 | `Colors/Light Neutral/600` | `#979797` |
| 700 | `Colors/Light Neutral/700` | `#767676` |
| 800 | `Colors/Light Neutral/800` | `#5b5b5b` |
| 900 | `Colors/Light Neutral/900` | `#464646` |

### Dark Neutral

| Swatch | Token | Hex |
|---|---|---|
| 50 | `Colors/Dark Neutral/50` | `#efefef` |
| 100 | `Colors/Dark Neutral/100` | `#cccccc` |
| 200 | `Colors/Dark Neutral/200` | `#b4b4b4` |
| 300 | `Colors/Dark Neutral/300` | `#919191` |
| 400 | `Colors/Dark Neutral/400` | `#7c7c7c` |
| 500 | `Colors/Dark Neutral/500` | `#5b5b5b` |
| 600 | `Colors/Dark Neutral/600` | `#535353` |
| 700 | `Colors/Dark Neutral/700` | `#414141` |
| 800 | `Colors/Dark Neutral/800` | `#323232` |
| 900 | `Colors/Dark Neutral/900` | `#262626` |

### Black & White

| Token | Hex |
|---|---|
| `Colors/Black & White/White` | `#ffffff` |
| `Colors/Black & White/Black` | `#000000` |

---

## Semantic Color Tokens

### Typography

| Token | Hex | Usage |
|---|---|---|
| `Colors/Typography/text-primary- Dark` | `#262626` | Primary text on dark surfaces |
| `Colors/Typography/text-secondary- Dark` | `#323232` | Secondary text on dark surfaces |
| `Colors/Typography/text-primary- Light` | `#f6f6f6` | Primary text on light surfaces |
| `Colors/Typography/text-secondary- Light` | `#979797` | Secondary text on light surfaces |
| `Colors/Typography/text-tertiary` | `#767676` | Tertiary / placeholder text |
| `Colors/Typography/text-Brand` | `#00287a` | Brand-colored text |
| `Colors/Typography/Text - Brand - Label` | `#001643` | Brand-label text (darker, for field labels) |
| `Colors/Typography/text-sucess` | `#09984a` | Success state text |
| `Colors/Typography/text-error` | `#d62b2b` | Error state text |
| `Colors/Typography/text-Alert` | `#e4c124` | Warning / alert text |
| `Colors/Typography/Text - Disabled` | `#a6a6a6` | Disabled text |
| `Colors/Typography/Text - White` | `#ffffff` | White text |
| `Colors/Typography/text - info` | `#1059d2` | Informational text |
| `color/color/Typography/text-tertiary` | `#7e7d80` | Helper / hint text in inputs |
| `color/color/Typography/text-primary` | `#071e17` | Deep dark primary (darker variant used in some field contexts) |
| `color/color/Typography/text-invert` | `#ffffff` | Inverted text — white on dark/brand surfaces |
| `color/color/Typography/text-sucess` | `#29a46a` | Alternate success text (lighter than `text-sucess` #09984a) |
| `Text/text-primary` | `#141c25` | Default primary text |
| `Text/text-secondary` | `#344051` | Default secondary text |
| `TEXT/text-secondary-500` | `#8a959e` | Muted secondary text |
| `TEXT/text-secondary-400` | `#999999` | Lighter muted text |

### Surface

| Token | Hex | Usage |
|---|---|---|
| `Colors/Surface/surface-primary` | `#f6f6f6` | Primary background surface |
| `Colors/Surface/surface-secondary` | `#e3e3e3` | Secondary surface |
| `Colors/Surface/surface-tertiary` | `#c3c3c3` | Tertiary surface |
| `Colors/Surface/surface-brand` | `#00287a` | Brand-colored surface |
| `Colors/Surface/surface-brand - subtler` | `#edf3fa` | Brand-tinted extra-light surface (= Brand Color/25) |
| `Colors/Surface/surface-White` | `#ffffff` | Explicit white surface |
| `Colors/Surface/surface-disabled` | `#d6d6d6` | Disabled surface |
| `Colors/Surface/surface-success` | `#0aa751` | Success surface |
| `Colors/Surface/surface-sucess-subtle` | `#5bc48a` | Subtle success surface |
| `Colors/Surface/surface-error` | `#d62b2b` | Error surface |
| `Colors/Surface/surface-warning` | `#fad428` | Warning surface |
| `Colors/Surface/surface-Info` | `#1059d2` | Info surface |
| `Colors/Surface/surface-Info-subtler` | `#edf3fa` | Info extra-light surface (same value as surface-brand-subtler) |
| `Colors/Surface/surface-error-subtle` | `#e47171` | Error subtle surface (= Danger/300) |
| `Colors/Surface/surface-error-subtler` | `#fbeaea` | Error extra-light surface (= Danger/50) |
| `Colors/Surface/surface-sucess-subtler` | `#e7f6ee` | Success extra-light surface (= Success/50) |
| `Background Colors/bg-primary` | `#ffffff` | Page/screen background |
| `Background Colors/bg-0` | `#ffffff` | Explicit white background (alias) |
| `Background Colors/bg-tertiary` | `#f2f4f7` | Subtle tertiary background |
| `Colors/Base/200` | `#f0f0f0` | Base light surface |
| `Colors/Base/900` | `#201f21` | Base near-black |

### Border

| Token | Hex | Usage |
|---|---|---|
| `Colors/Border/border-primary` | `#5b5b5b` | Default strong border |
| `Colors/Border/border-secondary` | `#a6a6a6` | Subdued border |
| `Colors/Border/border-selected` | `#323232` | Selected/active border |
| `Colors/Border/border-brand` | `#00287a` | Brand border |
| `Colors/Border/border-light` | `#e3e3e3` | Light rule / divider (= Light Neutral/100) |
| `Colors/Border/border-disabled` | `#d6d6d6` | Disabled border |
| `Colors/Border/border-success` | `#09984a` | Success border |
| `Colors/Border/border-error` | `#c32727` | Error border |
| `Colors/Border/border-warning` | `#e4c124` | Warning border |
| `Colors/Border/border-Info` | `#1059d2` | Info border |
| `Colors/Border/border-white` | `#ffffff` | White border (used on dark/brand surfaces) |
| `Border Colors/border-secondary` | `#e4e7ec` | Light rule / divider |
| `Border Colors/border-tertiary_hover` | `#97a1af` | Tertiary border on hover |
| `BORDER/border-secondary` | `#ececec` | Extra-light separator |

### Foreground (Icons & Graphics)

| Token | Hex | Usage |
|---|---|---|
| `Colors/Foreground/foreground-bold` | `#323232` | High-emphasis icons, graphics |
| `Colors/Foreground/foreground-subtle` | `#7c7c7c` | Low-emphasis icons, supporting graphics |
| `Colors/Foreground/foreground-brand-primary` | `#00287a` | Brand-colored icons & highlights |
| `Icons/icon-500` | `#637083` | Default icon color |

### Button

| Token | Hex | Usage |
|---|---|---|
| `Colors/Button/button-primary-bg-default` | `#00287a` | Primary button default background |
| `Colors/Button/button-primary-bg-pressed` | `#546fa6` | Primary button pressed background |
| `Colors/Button/button-primary-Text` | `#ffffff` | Primary button text / icon |
| `Colors/Button/button-secondary-bg-default` | `#b8b8b8` | Secondary button default background |
| `Colors/Button/button-secondary-bg-pressed` | `#e3e3e3` | Secondary button pressed background |
| `Colors/Button/button-secondary-Text` | `#ffffff` | Secondary button text / icon |

---

## Grid

**Figma node:** `169:4011`

Mobile layout grid for the Hiro app (iPhone / Android).

| Property | Value |
|---|---|
| Viewport width | 393px |
| Viewport height | 852px |
| Left margin | 24px |
| Right margin | 24px |
| Gutter (column gap) | 16px |
| Container width | 345px |

---

## Spacing

**Figma node:** `169:4012`

A full spacing scale. All values in pixels.

| Token | Value | Usage |
|---|---|---|
| `Spacing/0` / `padding-none` | 0px | No spacing |
| `Spacing/2` | 2px | Micro spacing between icons and text, badges, or compact UI elements |
| `Spacing/4` | 4px | Extra-small padding inside chips, tags, and compact components |
| `Spacing/8` / `Spacing/8` / `SPACING/spacing-2xs` | 8px | Spacing between related elements such as icon–label |
| `padding-6` | 6px | — |
| `padding-10` | 10px | — |
| `Spacing/12` / `Spacing and Radius/Spacing/2xs` | 12px | Default spacing between components within a section |
| `Spacing/16` / `padding-16` | 16px | Core width/padding for cards, forms, and content blocks |
| `Spacing/20` | 20px | Standard sub-component spacing and icon padding |
| `Spacing/24` / `SPACING/spacing-lg` / `Spacing and Radius/Spacing/m` | 24px | Spacing between related content sections |
| `Spacing/28` / `padding-28` | 28px | Button horizontal padding (Large) |
| `Spacing/32` | 32px | Large spacing between major UI components |
| `Spacing and Radius/Spacing/3xl` / `Spacing/44` | 44px | Spacious layout / touch target minimum height |
| `padding-40` / `Spacing/40` | 40px | Large-canvas padding and dashboard sections |
| `SPACING/spacing-5xl` | 64px | Maximum spacing for hero sections and page canvas |

---

## Border Radius

**Figma node:** `169:4012`

| Token | Value | Usage |
|---|---|---|
| `Spacing and Radius/Radius/Radius-minimal-500` | 2px | Toasts, snackbars (near-square corners) |
| `Radius/xxs` | 4px | Small badges, code chips |
| `Spacing and Radius/Radius/Radius-minimal-300` / `radius-xs` | 6px | Checkboxes, small tags |
| `Spacing and Radius/Radius/Radius-minimal-200` / `Radius/s` | 8px | Small cards, tags |
| `Spacing and Radius/Radius/Radius-minimal-100` | 10px | Input fields (`Radius/m`) |
| `Radius/m` | 10px | Input fields, dropdowns |
| `Radius/12` | 12px | Buttons, OTP boxes, feature cards |
| `Spacing and Radius/Radius/Radius-minimal-50` | 12px | — |
| `Spacing and Radius/Radius/Radius-semi rounded-400` / `radius-xl` / `Radius/xl` | 16px | Medium cards |
| `Radius/xxl` | 20px | Bottom navigation, large sheets (`Radius/xxl`) |
| `Spacing and Radius/Radius/Radius-semi rounded-300` | 20px | — |
| `Radius/3` / `RADIUS/radius-rounded-01` | 24px | Cards, modals |
| `Radius/xxxl` | 32px | Large bottom sheets |
| `Spacing and Radius/Radius/Radius-semi rounded-200` | 32px | — |
| `Spacing and Radius/Radius/Radius-semi rounded-100` | 48px | Hero containers |
| `Radius/x4l` | 48px | Status pills, filter chips |
| `border-radius-xl` | 40px | Bottom Sheet Modal top corners |
| `Spacing and Radius/Radius/Radius-rounded` / `radius-max` / `Radius/max` | 999px | Pills, toggles, avatars (fully round) |

---

## Drop Shadows

**Figma node:** `169:4013`

| Token | CSS Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(32,31,33,0.05)` | Subtle depth for flat elements, chips |
| `shadow-s` | `0 1px 3px rgba(32,31,33,0.08)` | Cards, input fields at rest |
| `shadow-m` | `0 4px 6px -1px rgba(32,31,33,0.08)` | Elevated cards, dropdowns |
| `shadow-l` | `0 10px 15px -3px rgba(32,31,33,0.04)` | Modals, popovers |
| `shadow-xl` | `0 20px 25px -5px rgba(32,31,33,0.04)` | Full-screen overlays |
| `shadow-xsl` | `0 25px 50px -12px rgba(32,31,33,0.15)` | Deep elevation, hero floating elements |
| `tabs-shadow` | `0 1px 3px rgba(32,31,33,0.05)` | Tab bar / bottom navigation |
| `button - shadow` | `0 1px 2px rgba(32,31,33,0.04)` | All button states (Figma token name uses spaces: `button - shadow`) |

---

## Miscellaneous Tokens

| Token | Value | Notes |
|---|---|---|
| `TEXT/text-secondary-500` | `#8a959e` | — |
| `TEXT/text-secondary-400` | `#999999` | — |
| `BORDER/border-secondary` | `#ececec` | Extra-light separator |
| `Colors/Base/200` | `#f0f0f0` | — |
| `Colors/Base/900` | `#201f21` | — |
| `Icons/icon-500` | `#637083` | Default icon color |

---

## Components

### Bottom Navigation

A bottom navigation bar providing access to the app's 5 primary destinations. Displayed at the bottom of the screen.

**Figma node:** `148:1151`

#### Anatomy

```
┌─────────────────────────────────────┐
│  [Home]   [Call]  [Calendar] [Acct] │  ← 345px wide
└─────────────────────────────────────┘
```

#### Props

| Prop | Type | Default |
|---|---|---|
| `type` | `"Default" \| "Home" \| "Inbox" \| "Call" \| "Calendar" \| "Account"` | `"Default"` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 345px |
| Background | `#ffffff` |
| Border radius | 20px (`Radius/xxl`) |
| Vertical padding | 8px |
| Gap between tabs | 4px |
| Tab horizontal padding | 20px |
| Icon size | 28×28px |
| Shadow | `tabs-shadow` → `0 1px 3px rgba(32,31,33,0.05)` |

#### Tab Items

| Tab | Icon (inactive) | Icon (active) |
|---|---|---|
| Home | outlined house | filled house |
| Inbox | outlined inbox/mail box | filled inbox |
| Call | outlined phone | filled phone |
| Calendar | outlined calendar | filled calendar |
| Account | outlined person | filled person |

#### States

**Active tab**
- Label: Poppins, 12px, SemiBold (600) — Home; Medium (500) — Call / Calendar / Account
- Label color: `Colors/Typography/text-Brand` → `#00287a`
- Icon: filled variant

**Inactive tab**
- Label: Poppins, 12px, Regular (400)
- Label color: `Colors/Typography/text-secondary- Light` → `#979797`
- Icon: outlined variant

#### Variants

| Variant | Description |
|---|---|
| Default (icon-only) | 392px wide, icons only, no labels — compact style |
| With labels | 345px wide, icon + label stacked — standard style |
| Pill active | 394px wide, active tab gets a rounded pill/chip background indicator |

---

### Bottom Sheet Modal

A full-screen overlay that slides up from the bottom edge, presenting contextual content or actions above a blurred backdrop. Used for confirmations, detail views, or multi-step flows.

**Figma node:** `168:2564`

#### Anatomy

```
┌──────────────────────────────────────┐
│  ━━━  (drag handle, 36×5px)          │
│  [×]  close button                   │
│                                      │
│  [icon]                              │
│  Title (28px SemiBold, brand)        │
│  Description (14px Regular)         │
│                                      │
│  [Primary Button — full width]       │
│  [Secondary Button — full width]     │
│  ──────────── home indicator ──────── │
└──────────────────────────────────────┘
```

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 390px |
| Background | `#ffffff` |
| Backdrop | `rgba(0,0,0,0.1)` blur 4px |
| Top radius | 40px |
| Top padding | 40px |
| Horizontal padding | 24px |
| Handle size | 36×5px, `#c6c8d2`, radius 100px |
| Handle offset from top | 8px |
| Section gap | 40px |
| CTA gap | 12px |
| Button height | 58px |
| Button radius | 12px |

#### States & Colors

| Element | Color token | Hex |
|---|---|---|
| Title | `Colors/Typography/text-Brand` | `#00287a` |
| Description | `Colors/Typography/text-secondary-Dark` | `#323232` |
| Primary button bg | `Colors/Button/button-primary-bg-default` | `#00287a` |
| Primary button text | white | `#ffffff` |
| Secondary button bg | `Colors/Button/button-secondary-bg-default` | `#b8b8b8` |
| Secondary button text | white | `#ffffff` |
| Drag handle | `Surface/Neutral/200` | `#c6c8d2` |

#### Variant: Onboarding Modal

Used in the assistant setup flow to select voice, timezone, and personality in a bottom-sheet format.

**Figma node:** `168:2564` (second canvas section)

| Sub-type | Content | Layout |
|---|---|---|
| Select Voice | Grid of voice options with avatar initials, name, and language tag; selected item has brand border and audio waveform preview | 3-column grid, scrollable |
| Select Timezone | Search field at top, scrollable list of timezone entries (name + UTC offset, e.g. "America / New York" + "GMT-4"); selected row has checkmark + brand highlight | Single column list |
| Select Personality | List of 3 personality profiles (e.g. "Professional — Formal", "Casual — Friendly & Accessible", "Warm — Empathetic & Personal") | Single column, radio-style selection |

All three sub-types share the standard Bottom Sheet Modal shell (drag handle, close button, `Radius/xxxl` 40px top corners, white background, horizontal padding 24px). The CTA at the bottom uses the full-width Primary button.

#### Typography

| Element | Style | Size | Weight |
|---|---|---|---|
| Title | Heading 02 SemiBold | 28px | 600 |
| Description | Body Label 02 Regular | 14px | 400 |
| Button label | Body Label 01 Medium | 16px | 500 |

---

### Breadcrumbs

A navigation aid showing the user's location within a hierarchy. Supports 2-level and 3-level variants.

**Figma node:** `168:2933`

#### Props / Variants

| Prop | Type | Values |
|---|---|---|
| `type` | string | `"2"` (2 levels), `"3"` (3 levels) |
| `changeText` | string | label text (default `"Text"`) |

#### Dimensions & Layout

- Height: 18px
- Gap between items: 1px (effectively flush)
- Chevron icon: 16×16px

#### Typography & Colors

| Element | Style | Size | Color token | Hex |
|---|---|---|---|---|
| Ancestor links | Caption 01 Regular | 12px | `Colors/Typography/text-tertiary` | `#767676` |
| Current page | Caption 01 Medium | 12px | `Colors/Typography/text-secondary-Dark` | `#323232` |
| Separator chevron | — | 16×16px | — | — |

---

### Buttons

Interactive controls for triggering actions. Five distinct types across three sizes and four states.

**Figma node:** `62:33202`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Primary`, `Secondary / Outline`, `Tertiary`, `Destructive`, `Link`, `Icon Only`, `FAB`, `Social Login` |
| `state` | `Default`, `Pressed`, `Disabled`, `Loading` |
| `size` | `Large`, `Medium`, `Small` |

#### Dimensions

| Size | Height | Padding (H) | Typography |
|---|---|---|---|
| Large | 58px | 28px | Body Label 01 Medium, 16px |
| Medium | 45px | 20px | Body Label 02 Medium, 14px |
| Small | 34–42px | 16px | Body Label 02 Medium, 14px |

Button radius: 12px (`Radius/12`). Shadow: `button-shadow` → `0 1px 2px rgba(32,31,33,0.04)`.

#### States & Colors

| Type | State | Background | Text |
|---|---|---|---|
| Primary | Default | `#00287a` | `#ffffff` |
| Primary | Pressed | `#546fa6` | `#ffffff` |
| Primary | Disabled | `#d6d6d6` | `#ffffff` |
| Secondary / Outline | Default | `#b8b8b8` | `#ffffff` |
| Secondary / Outline | Pressed | `#e3e3e3` | `#ffffff` |
| Tertiary | Default | transparent / outlined | `#00287a` |
| Destructive | Default | `#d62b2b` | `#ffffff` |
| Link | Default | transparent | `#00287a` |

Icon Only buttons use the same sizing but show only a 24×24px icon (Large), 20×20px (Medium), or 16×16px (Small).

#### FAB (Floating Action Button)

A circular button that floats above content for a primary contextual action.

| Property | Value |
|---|---|
| Shape | Circle, 56×56px |
| Background | `Colors/Button/button-primary-bg-default` → `#00287a` |
| Icon | 24×24px, white |
| Shadow | `shadow-xxl` |
| Radius | 999px (full circle) |

#### Social Login Buttons

Platform-branded buttons for Google and Apple sign-in. Used on login / registration screens.

| Property | Value |
|---|---|
| Height | 58px (Large) |
| Background | `#ffffff` (white) |
| Border | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Border radius | 12px (`Radius/l`) |
| Text color | `Colors/Typography/text-primary-Dark` → `#262626` |
| Icon | 24×24px platform logo (Google multicolor, Apple black) |
| Shadow | `button - shadow` |

#### Usage

| Type | Use case |
|---|---|
| Primary | Main action on a page (Submit, Save, Continue) |
| Secondary / Outline | Alternative / supporting actions |
| Tertiary | Low-priority or optional actions |
| Destructive | Irreversible actions (Delete, Remove, Deactivate) |
| Link | Navigation-like actions / hyperlinks |
| Icon Only | Compact actions where icon is self-explanatory |
| FAB | Floating primary action overlaid on content |
| Social Login | Google / Apple authentication on login screens |

---

### Calendar and Time

Date picker and time picker modals used in scheduling flows (reminders, tasks, call filters).

**Figma node:** `1834:41368`

#### Calendar Picker

A monthly calendar grid displayed inside a card/modal with navigation and action buttons.

| Property | Value |
|---|---|
| Width | ~265px |
| Background | `#ffffff` |
| Border radius | 12px (`Radius/12`) |
| Shadow | `shadow-s` |
| Close button | Top-right × |

| Element | Style | Color |
|---|---|---|
| Month/Year header | Sub Heading 02 SemiBold, 18px | `#262626` |
| Prev/Next arrows | 20×20px `chevron_left` / `chevron_right` | `#262626` |
| Day-of-week labels | Caption 01 Regular, 12px | `#979797` |
| Default date | Body Label 02 Regular, 14px | `#262626` |
| Selected date | Solid navy circle, white text | bg `#00287a`, text `#ffffff` |
| Range in-between days | Light brand tint | bg `#edf3fa`, text `#262626` |
| Out-of-month dates | Muted | `#c3c3c3` |

Variants: Single selection · Range selection start · Range selection end.

Action buttons (bottom row): **Reset** (Tertiary outline, `#00287a`) · **Continue** (Primary solid navy).

#### Time Picker

A drum-roll / scroll-wheel time picker displayed as a modal.

| Property | Value |
|---|---|
| Title | "Set time" — Sub Heading 02 SemiBold, `#262626` |
| Close button | Top-right × |
| Columns | Hours (HH) · Minutes (MM) · AM/PM |

| Element | Style | Color |
|---|---|---|
| Selected row | Sub Heading 01 SemiBold, 20px | `#00287a` |
| Adjacent rows | Caption 01 Regular, 12px | `#979797` |

Action buttons: **Cancel** (Tertiary) · **Continue** (Primary navy).

---

### Call Module Components

A suite of UI components used within the Calls module — live call screen, call history, call detail cards, and all related modals and bottom sheets.

**Figma node:** `1834:42184`

#### Hiro AI Avatar States

Animated avatar states on the live call screen showing what Hiro is doing.

| State | Visual |
|---|---|
| Dialing | Static Hiro mascot |
| Talking | Mascot + waveform bars + `• Live` badge |
| Listening | Mascot with 2–3 concentric brand-color pulse rings |
| Thinking | Mascot with `?` speech bubble (4 animation variants) |

Pulse ring colors: `Brand Color/100` (#b0bcd6) → `Brand Color/50` (#e6eaf2).

#### Chat Bubbles

In-call and transcript message bubbles. **Figma node:** `1692:110605`

| Variant | Alignment | Background | Text |
|---|---|---|---|
| Chat — Caller | Left | `#edf3fa` | `#262626` |
| Chat — Hiro | Left | `#00287a` | `#ffffff` |
| Transcript — Caller | Right | `#f6f6f6` | `#262626` |
| Transcript — Hiro | Right | `#edf3fa` | `#262626` |

Border radius: 12px. Body: Body Label 02 Regular, 14px. Timestamp: Caption 01, 12px, `#979797`.

#### Playback Bar

Audio playback control for call recordings and AI audio summaries. **Figma node:** `1692:117305`

| Variant | Width | Height |
|---|---|---|
| Audio Summary | 313px | 32px |
| Full Playback | 313px | 48px |

Elements: Play/Pause button (24×24px, `#00287a`) · waveform visualization · duration (Roboto Mono, `#979797`). States: `Play=True`, `Play=False`.

#### Keypad

In-call dialpad for DTMF input. **Figma node:** `1692:110597`

| Property | Value |
|---|---|
| Width | 393px |
| Layout | 3-col × 4-row + * / 0 / # row |
| Key text | Sub Heading 01 Regular, 20px, `#262626` |
| Sub-label | Caption 01 Regular, 12px, `#979797` |
| End Call button | 56×56px circle, `#d62b2b` bg, white × icon |

#### Call Buttons (Listen / End)

Two in-call action buttons. **Figma node:** `1692:117326`

| Type | Size | Background | Icon |
|---|---|---|---|
| Listen | 86×86px circle | `#edf3fa` | `headset`, `#00287a` |
| End | 86×86px circle | `#d62b2b` | `call_end`, white |

#### Extended Call Row States

Extended props for call rows in the Calls module list. **Figma node:** `1692:109082`

| Prop | Values |
|---|---|
| `State` | `Unread`, `Read` |
| `Type` | `Missed Call`, `Missed Call - VIP`, `Recording`, `VIP`, `Blocked`, `Spam`, `Default` |
| `Known` | `True` (named contact), `False` (phone number shown) |

Unread rows: 3px left border `#00287a`. VIP rows show navy VIP badge alongside status pill.

#### Call Details Card

Expandable accordion cards on the call detail screen. **Figma node:** `1703:16651`

| Section | Expanded content |
|---|---|
| AI Summary | 3–4 sentence AI summary + "Play Audio summary" playback link |
| Follow-ups | Actionable follow-up text + "Add Reminder" outline button |
| Recordings | Playback bar with waveform + duration |
| Memories | Short note of remembered caller details |
| Timeline | Chronological event list |
| Tasks | Task list or "+ Add task" CTA when empty |
| Reminder | Reminder or "+ Add Reminder" CTA when empty |

Collapsed rows: 67px tall header only. Section title: Body Label 02 SemiBold, 14px, `#00287a`. Empty state: illustration + helper text + CTA.

#### Timeline

Vertical event log inside the Call Details Card. **Figma node:** `1692:119979`

Events: Ringing · Line · In progress · Outbound answered · Approval requested · Outbound approved · Completed.

Row: 40px tall, 24×24px icon, Caption 01 Regular 12px text + timestamp `#979797`.

#### Activities Row

Task activity row in queue/detail view. **Figma node:** `1722:73169`

| State | Icon | Text |
|---|---|---|
| Pending | Clock outline, `#979797` | `#262626` |
| In progress | Clock filled, `#1059d2` | `#262626` |
| Completed | Check circle, `#09984a` | `#979797` (muted) |

Width: 313px. Heights: 59px (Default), 51px (Bottom).

#### Call Labels

Inline tags for call nature/priority. **Figma node:** `1692:109199`

| Label | Background | Text color |
|---|---|---|
| Urgent | `#fbeaea` | `#d62b2b` |
| Business | `#edf3fa` | `#1059d2` |
| Personal | `#edf3fa` | `#1059d2` |
| Sales | `#edf3fa` | `#1059d2` |

Typography: Caption 01 Medium, 12px. Border radius: 999px.

#### Icon Call

Small call-type indicators in call rows. **Figma node:** `1692:109270`

| Type | Color |
|---|---|
| Missed Call | `#d62b2b` |
| Received | `#09984a` |
| Spam / Block | `#979797` |

Container: 40×40px. Icon: 24×24px.

#### Task Queue Card

Queue item card for AI-assigned tasks. **Figma node:** `1723:15113`

States: Default · Processing · Empty State. Width: 345px. Border radius: 12px. Shadow: `shadow-s`.

#### Call Module Modals

Confirmation/action modals in the Calls module. **Figma node:** `1692:118654`

All modals: `#ffffff` bg, `Radius/3` (24px), `shadow-l`, 327px wide, 24px padding, 3D illustration icon, Cancel gray secondary button.

| Modal | CTA button | Style |
|---|---|---|
| Mark as Spam | "Mark as Spam" | Destructive red |
| Make VIP Contact | "Make VIP" | Primary navy |
| Block this caller | "Block" | Destructive red |
| Remove Contact | "Remove" | Destructive red |
| Delete Tasks | "Delete" | Destructive red |
| Delete Reminders | "Delete" | Destructive red |
| Regenerate Summary | "Regenerate" | Primary navy |
| Call Complete | — | Success green title, Outcome Summary (Date + Duration) |

#### Call Module Bottom Sheets

Bottom sheets for filtering, notes, approvals, and reminders. **Figma node:** `1834:28977`

All use the standard Bottom Sheet Modal shell (40px top radius, drag handle, 24px h-padding, white bg).

| Type | Key content | Height |
|---|---|---|
| Add Note | "Note *" textarea, Confirm + Cancel | 553px |
| Approval Needed | "Email *" input, Confirm + Cancel | 512px |
| Advance Filter (compact) | Call Status chips · Call Type chips · Date Range · Call Duration chips | 820px |
| Advance Filter (full) | + Country/Region search · Recording filter · Sorting options | 1360px |
| Create Reminder (compact) | Title · Due Date · Due Time · Call Duration · Description · Add to Queue | 820px |
| Create Reminder (full) | Same, expanded | 935px |

Call Status chips: All · Completed · In Progress · Failed · Cancelled.
Call Duration chips: Any · < 30s · 30s–3m · 3m–1m · 5m+.

#### Bottom Sheet Sort / Type / Country

Simpler bottom sheets for sorting and filtering. **Figma node:** `1834:28970`

| Type | Content | Height |
|---|---|---|
| Sort | Newest · Oldest · Recently Started (radio list) | 376px |
| Type | Call type filter options | 602px |
| Country | Country search + scrollable list with flags | 820px |

---

### Card

Cards used for security, authentication, and 2FA flows.

**Figma node:** `367:43696`

#### Base Dimensions & Layout

| Property | Value |
|---|---|
| Background | `#ffffff` |
| Border | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Border radius | 12px (`Radius/12`) |
| Shadow | `shadow-s` → `0 1px 3px rgba(32,31,33,0.08)` |
| Horizontal padding | 16px |
| Vertical padding | 16px |

#### Variant: Two Factor Authenticator

TOTP code card. Shows shield icon, title, instruction, 6-digit OTP boxes, and countdown text.

| Element | Value |
|---|---|
| Icon | Shield with checkmark (3D green, from Icons Sets) |
| OTP boxes | 6 cells, Roboto Mono, `surface-brand - subtler` bg |
| Footer text | "Code Refresh every 90 seconds" — Caption 01 Regular, `#979797` |

#### Variant: Email Two Factor Authenticator

Email-based MFA card. Identical layout to TOTP but replaces countdown with "Resend Code" link.

| Element | Value |
|---|---|
| Icon | Shield with checkmark (3D green) |
| OTP boxes | 6 cells, Roboto Mono |
| Footer | "Didn't receive an email? **Resend Code**" — Caption 01, link in brand blue |
| Countdown state | "You can resend OTP in **55 seconds**" |

#### Variant: Recovery Code

Single text input for entering a saved recovery code.

| Element | Value |
|---|---|
| Icon | Shield with checkmark (3D green) |
| Input | `Enter Recovery Code` placeholder, full-width, `Radius/m` (10px) |
| Helper | "Recovery codes were provided during MFA Setup" — Caption 01 |

#### Variant: Login Verified

Success confirmation card shown after OTP is accepted.

| Element | Value |
|---|---|
| Icon | Green check circle (from Icons Sets) |
| Title color | `Colors/Typography/text-sucess` → `#09984a` |
| Body | "Your OTP has been verified successfully. You can now continue to browse your account." |

#### Variant: Cards_2FA Setup

The full 2FA onboarding setup card. Contains three sub-panels rendered together:

**Panel A — Check Your Email**

| Element | Value |
|---|---|
| Icon | Mail with notification badge (from Icons Sets) |
| Title | "Check your email" |
| Body | "we sent verification link to [email]" |
| Helper | "Open the link in the email to verify your account. If you don't see it, check your spam folder" |

**Panel B — Scan QR Code**

| Element | Value |
|---|---|
| QR code | 120×120px placeholder image |
| Setup key | Roboto Mono 14px, format `1232 A8DA DASF DA8SD A8D0` + inline copy icon |
| Fallback link | "Can't scan? Use setup key" — Caption 01, brand blue |
| OTP entry | "Enter 6 - Digit Code" label + 6 OTP boxes (error state available) |
| Error state | OTP boxes turn red, "Incorrect code. Please try again." helper text |

**Panel C — Recovery Codes**

| Element | Value |
|---|---|
| Title | "Recovery Codes" — Body Label 01 SemiBold |
| Grid | 2-column × 4 rows, Roboto Mono 13px, format `712k-9map` |
| Actions | "Copy All" (outline) + "Save / Share" (primary) buttons |

#### Variant: Security Setup Complete

List card showing all active 2FA methods after setup is complete.

| Element | Value |
|---|---|
| Header | "Security setup complete" — Body Label 01 SemiBold, `#262626` |
| Row items | Icon + "App OTP" title + "Generates a new 6-digit code every 30s" description + "Active" pill |
| Optional row | "Backup Codes" — 8 codes saved, single use |
| Status pill | Positive V1 Small — `surface-sucess-subtle` (#5bc48a) bg, `#09984a` text |

#### Key Sub-components

- **OTP row**: 6 cells, each ~44px wide, `Radius/12`, `surface-brand - subtler` background, Roboto Mono
- **Setup key**: Roboto Mono 14px, spaced groups (`1232 ASDA DASF …`), inline copy button
- **Recovery code grid**: 2-column, Roboto Mono 13px, `712k-9map` format, numbered
- **Status pill (Active)**: Positive V1 Small — green bg, `#09984a` text

---

### Call Row

A list item displaying a logged call entry with caller info, call type, status, duration, and an optional chevron.

**Figma node:** `177:9132`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Call Recieved`, `misscalled`, `Completed`, `No Recording` |
| `position` | `Top`, `Bottom` |
| `withChervon` | `True`, `False` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 394px |
| Padding (H) | 24px |
| Padding (V) | 16px |
| Avatar size | 52×52px, radius 30px |
| Avatar bg (received) | `Colors/Surface/surface-sucess-subtler` → `#e7f6ee` |
| Gap (avatar → content) | 8px |
| Bottom border | 1px, `Colors/Border/border-light` → `#e3e3e3` |

#### Typography & Colors

| Element | Style | Size | Color |
|---|---|---|---|
| Caller name | Sub Headings 02 Medium | 18px | `#262626` |
| Tag (e.g. Business) | Caption 01 Regular | 12px | `#1059d2` (text-info) |
| Status (e.g. Ready) | Caption 01 Medium | 12px | `#09984a` (text-success) |
| Meta (duration, time) | Caption 01 Regular | 12px | `#979797` |

#### Status Variants

| Status | Pill type | Color |
|---|---|---|
| Completed | Positive V1 Small | `#5bc48a` bg, `#09984a` text |
| Missed Call | Negative V1 Small | `#fbeaea` bg, `#d62b2b` text |
| No Recording | Neutral V1 Small | light gray bg, `#5b5b5b` text |

---

### Checkbox

A selection control with label and helper text. Supports medium and small sizes, checked, unchecked, and indeterminate states.

**Figma node:** `168:3396`

#### Base Control

| Property | Value |
|---|---|
| Medium size | 20×20px, radius 4px (`Radius/xxs`) |
| Small size | 16×16px, radius 4px |
| Border | 1.5px, `Colors/Border/border-light` → `#e3e3e3` |
| Unchecked bg | `#ffffff` |
| Checked bg | `Colors/Surface/surface-brand` → `#00287a`, white checkmark |
| Gap (box → label) | 8px |

#### Props / Variants

| Prop | Values |
|---|---|
| `size` | `Meduim` (20×20px), `Small` (16×16px) |
| `checked` | `true`, `false` |
| `indeterminate` | `true`, `false` |

#### Variant: Checkbox_label

The standard form checkbox — control + stacked label row + helper text row + optional button link. Used in forms and settings screens.

| Element | Style | Color |
|---|---|---|
| Label text | Body Label 01 Regular, 16px | `Colors/Typography/Text - Brand - Label` → `#001643` |
| Required marker (`*`) | Body Label 01 Regular | `#d62b2b` (error) |
| Info icon | 16×16px | `#001643` |
| Helper text | Caption 01 Regular, 12px | `color/color/Typography/text-tertiary` → `#7e7d80` |
| Inline link (button) | Caption 01 Medium, 12px | `Colors/Typography/text-Brand` → `#00287a` |

#### Variant: Task Row

A task/to-do item row combining a checkbox, task title, and priority + type badges.

| Property | Value |
|---|---|
| Width | full-width row |
| Layout | Checkbox (left) + task title + badges (right) + chevron |
| Unchecked state | White checkbox, normal title weight |
| Checked state | Navy checkmark, title rendered with strikethrough |
| Title | Body Label 01 Regular, 16px, `#262626` |
| Timestamp | Caption 01 Regular, 12px, `#979797` (e.g. "Tomorrow at 10:00 AM") |
| Chevron | 24×24px `chevron_right`, `#979797` |

Badges shown alongside the title:

| Badge | Style | Color |
|---|---|---|
| High (priority) | Negative V1 Small | `#fbeaea` bg, `#d62b2b` text |
| VIP (type) | `surface-brand-subtler` bg, `#00287a` border + text | outlined brand |

Example: "Follow up with Alex" — High badge, VIP badge, chevron.

#### Variant: Checkbox_Container

A card-style checkbox used for single-statement confirmations. The entire row is enclosed in a rounded bordered container — tapping anywhere on the card toggles the checkbox. Used in flows like "I've saved my backup codes in a safe place."

| Property | Value |
|---|---|
| Container bg (unchecked) | `#ffffff` |
| Container bg (checked) | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Container border (unchecked) | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Container border (checked) | 1px `Colors/Border/border-brand` → `#00287a` |
| Border radius | 12px (`Radius/12`) |
| Padding | 16px |
| Label | Body Label 01 Regular, 16px, `#001643` |

---

### Close Button

A small icon button used to dismiss dialogs, sheets, and toasts.

**Figma node:** `168:2934`

#### Props / Variants

| Prop | Values |
|---|---|
| `size` | `Large` (24×24px touch area, 16×16px icon), `Medium` (16×16px touch area, 12×12px icon) |
| `state` | `Default`, `Pressed`, `Disbaled` |

#### Dimensions

| Size | Container | Icon |
|---|---|---|
| Large | 24×24px, padding 4px | 16×16px |
| Medium | 16×16px, padding 2px | 12×12px |

Border radius: 2px (`Spacing and Radius/Radius/Radius-minimal-500`).

---

### Contact Row

A list item for displaying a contact with name, phone number, company tag, and status badge.

**Figma node:** `177:8796`

#### Props / Variants

| Prop | Values |
|---|---|
| `position` | `Top`, `Middle`, `bottom`, `Default` |
| `withChervon` | `True`, `False` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 394px |
| Padding (H) | 24px |
| Padding (V) | 16px |
| Avatar size | 52×52px, radius 30px |
| Avatar bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Avatar text | Sub Heading 01 Medium, 20px, `#00287a` |
| Bottom border | 1px, `Colors/Border/border-light` → `#e3e3e3` |

#### Typography & Colors

| Element | Style | Size | Color |
|---|---|---|---|
| Contact name | Sub Headings 02 Medium | 18px | `#262626` |
| Phone / account | Caption 01 Regular | 12px | `#979797` |
| Company description | Caption 01 Regular | 12px | `#979797` |
| Business tag (pill) | Caption 01 Medium | 12px | `#1059d2` (Info pill) |

#### Alphabetical Section Divider

A thin separator row used to group contacts by first letter in a scrollable contact list.

| Property | Value |
|---|---|
| Content | Single letter (e.g. "J") |
| Typography | Caption 01 Regular, 12px, `#979797` |
| Bottom border | 1px `#e3e3e3` |
| Height | ~24px |
| Left padding | 24px |

---

### Dropdown

A select-style input with label, trigger, expand icon, and helper text.

**Figma node:** `168:2936`

#### Props / Variants

| Prop | Values |
|---|---|
| `state` | `Default`, `Typing`, `Filled`, `Disabled` |
| `showLabel` | boolean |
| `showHelperText` | boolean |
| `showPlacehorder` | boolean |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 348px |
| Input height | ~56px (16px padding all sides) |
| Input bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Border radius | 10px (`Radius/m`) |
| Gap (label → input → helper) | 8px |
| Expand icon | 24×24px (`expand_more`) |

#### Typography & Colors

| Element | Style | Size | Color |
|---|---|---|---|
| Label | Body Label 01 Regular | 16px | `#001643` (Text - Brand - Label) |
| Placeholder | Body Label 01 Regular | 16px | `#979797` |
| Helper text | Caption 01 Regular | 12px | `#7e7d80` |

#### Open State (Option List)

When triggered, the dropdown expands to show a bordered option list below the trigger.

| Property | Value |
|---|---|
| List bg | `#ffffff` |
| List border | 1px `#e3e3e3` |
| List border radius | 10px |
| Option row height | ~44px |
| Option text | Body Label 01 Regular, 16px, `#262626` |
| Selected option | Body Label 01 Medium, `#00287a`, checkmark on right |
| Hover/active row | `#edf3fa` bg tint |

#### Variant: Timezone Selector

A specialized dropdown variant used for timezone selection (e.g. in Reminder / Calendar flows).

| Property | Value |
|---|---|
| Trigger label | "Detected (Device)" placeholder |
| List item | Location name (e.g. "America / New York") + GMT offset (e.g. "GMT-4") |
| Item height | ~52px (two-line: name + offset) |
| Selected item | Brand navy highlight row + checkmark |
| Name style | Body Label 02 Medium, 14px, `#262626` |
| Offset style | Caption 01 Regular, 12px, `#979797` |

---

### Fields

A collection of input field components for data entry. Includes Text Fields, Password Field, Email Input, Text Area, Input Phone, OTP, OTP Fields, and Date Field.

**Figma node:** `168:3397`

All field variants share the same base structure: **Label → Input → HelperText**, stacked vertically with 8px gap.

#### Common Layout

| Property | Value |
|---|---|
| Width | 348px |
| Input padding | 16px all sides |
| Input bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Input border radius | 10px (`Radius/m`) |
| Input border (default) | 1px, `Colors/Border/border-light` → `#e3e3e3` |
| Label color | `#001643` (Text - Brand - Label), 16px Regular |
| Placeholder color | `#979797`, 16px Regular |
| Helper text color | `#7e7d80`, 12px Regular |

#### States

| State | Border | Background |
|---|---|---|
| Default | `#e3e3e3` | `#edf3fa` |
| Typing | brand border | `#edf3fa` |
| Active Typing | brand border highlighted | `#edf3fa` |
| Filled | `#e3e3e3` | `#edf3fa` |
| Error | `Colors/Border/border-error` → `#c32727` | error-subtler |
| Disabled | `Colors/Border/border-disabled` → `#d6d6d6` | `#d6d6d6` |

#### Sub-components

**Text Fields** — standard text input with optional right info icon.

**Password Field** — same as text field; right icon is a 24×24px visibility toggle.

**Email Input** — same layout as Text Field with email-specific placeholder.

**Text Area** — taller input box (162px height per variant), same field structure.

**Input Phone** — includes a flag/country code prefix on the left side of the input area.

**OTP Fields** — a horizontal row of 6 individual OTP cells, 328px wide.
- Each OTP cell: 48×48px, radius 12px (`Radius/12`), bg `#edf3fa`, border `#e3e3e3`
- Center character: Sub Heading 01 Regular, 20px, `#767676`
- States: Default, Typing, Filled, Error, Disabled

**Date Field** — text input with a calendar icon (24×24px) on the right. Placeholder: `MM/DD/YYYY`.

**Chatbox** — a chat input sub-component used in the AI assistant / chatbot interface.

| Property | Value |
|---|---|
| Layout | Multi-line text input with action buttons on the right |
| Input bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Border radius | 10px (`Radius/m`) |
| Input border | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Placeholder | "Type a message…", Body Label 01 Regular, `#979797` |
| Right actions | Send button (solid navy, `send` icon) + Record button (`mic` icon) |
| Send button | 40×40px, `#00287a` bg, white icon, radius 8px |
| Record button | 40×40px, outlined, brand icon |

#### Password Strength Indicator

- **Style 1** — single colored progress bar with label (Default, Too Weak, Weak, Good, Strong)
- **Style 2** — four-segment bar with checklist items (0 of 4 through 4 of 4). Width: 252px.

---

### Header

A page/screen header bar with a back arrow, title, and optional help icon.

**Figma node:** `168:2935`

#### Props / Variants

| Prop | Values |
|---|---|
| `property1` | `Default` (help icon), `Variant2` (kebab menu icon) |
| `changeText` | Title string |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 394px |
| Height | 60px (12px top + 12px bottom padding) |
| Horizontal padding | 24px |
| Background | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Bottom border | 1px, `#cecece` |
| Back icon | 24×24px (`arrow_back`) |
| Right icon — Default | 24×24px (`help_outline`) |
| Right icon — Variant2 | 24×24px (`more_vert`) |
| Gap (icon → title) | 12px |

#### Typography

| Element | Style | Size | Weight | Color |
|---|---|---|---|---|
| Title | Heading 03 SemiBold | 24px | 600 | `#262626` (text-primary-dark) |

---

### Mobile Device Components

iOS-style on-screen keyboard components for UI mockups. Includes AlphabeticKeyboard and NumericKeyboard.

**Figma node:** `208:9175`

#### AlphabeticKeyboard

| Prop | Values |
|---|---|
| `darkMode` | `true`, `false` |
| `type` | `Letters`, `Symbols` |
| `uppercase` | `true`, `false` |
| `predictive` | `true`, `false` |

Dimensions: 390×290px (without suggestion bar), 390×336px (with suggestion bar). Background: `#d1d3d9` (blur 54px). Each key: 32px wide, 42px tall, white bg with `0 1px 0 rgba(0,0,0,0.3)` shadow, radius 4.6px. Special keys (123, delete, shift): `#abb0bc`.

Font: SF Pro Display Regular 22px / SF Pro Text Regular 16px (system font, not Poppins).

#### NumericKeyboard

Same dimensions and key styling as AlphabeticKeyboard. Props: `darkMode`, `predictive`.

---

### Modal

A centered dialog overlay used for success confirmations, destructive confirmations, and error states.

**Figma node:** `168:2565`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Success`, `Confirmation Modal`, `Destructive modal`, `Error!` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 327px |
| Background | `#ffffff` |
| Padding (H) | 24px |
| Padding (V) | 24px |
| Border radius | 24px (`Radius/3`) |
| Shadow | `shadow-l` → `0 10px 15px -3px rgba(32,31,33,0.04)` |
| Internal gap | 32px |
| CTA button gap | 16px |
| Button height | medium ~45px, padding 12px V |

#### States & Colors

| Type | Title color | Accent |
|---|---|---|
| Success | `Colors/Typography/text-sucess` → `#09984a` | Green illustration |
| Error | `Colors/Typography/text-error` → `#d62b2b` | Red |
| Confirmation | `Colors/Typography/text-Brand` → `#00287a` | Brand blue |
| Destructive | danger red | Red |

#### Typography

| Element | Style | Size | Weight |
|---|---|---|---|
| Modal title | Heading 03 SemiBold | 24px | 600 |
| Description | Caption 01 Regular | 12px | 400 |
| Button label | Body Label 02 Medium | 14px | 500 |

---

### Other Icons

A set of illustrative icons used as hero/feature visuals inside cards and modals. Distinct from Material Symbols line icons — these are rich, multi-color graphics.

**Figma node:** `426:51341`

#### Icon Inventory

| Icon | Description | Colors used |
|---|---|---|
| Mail with badge | Envelope with red notification dot (badge "1") | White envelope, red badge (`Danger/100` #f2bdbd bg, `Danger/400` #de5555 dot) |
| Security shield | Green shield with white checkmark | `Success/100` (#b3e4c9) + `Success/400` (#3bb974) gradient fill |
| Green check circle | Solid green circle with white checkmark | `Success/400` (#3bb974) fill, white icon |
| Red X circle | Solid red circle with white × | `Danger/400` (#de5555) fill, white icon |

#### Usage

| Icon | Used in component |
|---|---|
| Security shield | All Card variants (2FA Authenticator, Email 2FA, Recovery Code) |
| Mail with badge | Cards_2FA Setup — "Check your email" panel |
| Green check circle | Login Verified card; success modals |
| Red X circle | Error states; destructive confirmation modals |

#### Dimensions

Icons are rendered at approximately 64–80px in card headers. They are SVG/vector assets, not bound to a specific pixel size.

#### Onboarding Illustrations

A set of human avatar and character illustrations used in onboarding screens (personality selection, voice setup, assistant intro).

| Asset | Description |
|---|---|
| Person avatars (×6) | Diverse illustrated human avatars in various ethnicities and styles — used in Voice / Personality selection cards |
| Star sparkle | Decorative accent star for hero/feature highlight moments |
| Hiro mascot (alt) | A variant of the Hiro helmet character used with sparkle effect for onboarding intro screens |

Rendered at ~56–80px in card contexts; larger (120–200px) as hero illustrations.

#### 3D Icons

A large library of 3D illustrated icons used throughout the Call Module (call states, tasks, calendar events, contact types, AI features). Blue/teal and red accent tones on white or transparent backgrounds.

| Category | Examples |
|---|---|
| Call states | Incoming call, missed call, completed call, call in progress |
| Contacts & people | Contact card, team group, VIP contact, unknown caller |
| Calendar & time | Calendar with event, clock, reminder |
| Tasks & follow-ups | Task list, checklist, completed task |
| AI & assistant | AI summary, Hiro processing, waveform |
| Security | Shield, lock, verified badge |
| Communication | Message, note, voicemail |

Rendered at ~40–80px. Full set visible at Figma node `426:51341` (3d Icons section).

---

### Overlay Loading

A full-screen overlay that blocks interaction while content loads.

**Figma node:** `168:2567`

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 393px |
| Height | 852px |
| Background | `rgba(0,0,0,0.1)`, blur 4px |
| Spinner size | 64×64px |
| Spinner + label gap | 16px |

#### Colors & Typography

| Element | Style | Color |
|---|---|---|
| Spinner | animated SVG | — |
| Loading label | Body Label 01 Medium, 16px | `Colors/Typography/text-secondary-Dark` → `#323232` |

---

### Radio Button

A single-selection control with label and helper text.

**Figma node:** `168:3398`

#### Props / Variants

| Prop | Values |
|---|---|
| `size` | `Meduim` (20×20px), `Small` (16×16px) |
| `checked` | `true`, `false` |

#### Dimensions & Layout

- Medium radio: 20×20px, radius 999px
- Small radio: 16×16px, radius 999px
- Border: 1.5px, `Colors/Border/border-light` → `#e3e3e3`
- Unchecked bg: `#ffffff`
- Checked: brand-colored fill with white center dot
- Gap (radio → label): 8px

#### Typography

| Element | Style | Size | Color |
|---|---|---|---|
| Label | Body Label 02 Regular | 14px | `#001643` (Text - Brand - Label) |
| Helper text | Caption 01 Regular | 12px | `#7e7d80` |

#### Variant: Plan Card

Card-style radio used for subscription plan selection.

| Property | Value |
|---|---|
| Layout | Plan name (left) + price (right), feature checklist below |
| Unselected bg | `#ffffff`, border `#e3e3e3` |
| Selected bg | `#edf3fa`, border `#00287a` (1px) |
| Border radius | 12px |
| Badge | "Most Popular" — navy pill, Caption 01 Medium |
| Plan name | Sub Heading 02 SemiBold, 18px, `#262626` |
| Price | Sub Heading 01 Bold, 20px, `#00287a` |
| Price period | Caption 01 Regular, 12px, `#979797` (`/month`) |
| Feature row | Checkmark icon (`#09984a`) + Caption 01 Regular, 12px, `#262626` |

#### Variant: Personality Card

Card-style radio for AI personality selection in onboarding.

| Property | Value |
|---|---|
| Layout | Avatar icon (left) + personality name + description (right) + radio (far right) |
| Border radius | 12px |
| Unselected border | 1px `#e3e3e3` |
| Selected border | 1px `#00287a`, bg `#edf3fa` |
| Name | Body Label 01 SemiBold, 16px, `#262626` |
| Description | Caption 01 Regular, 12px, `#979797` |

Personalities: Professional (Polite & Business-Focused) · Casual (Friendly & Approachable) · Warm (Supportive & Empathetic). Each has a distinct avatar illustration.

#### Variant: Voice Card

Card-style radio for AI voice selection in onboarding.

| Property | Value |
|---|---|
| Layout | Avatar photo/illustration (top) + name + language tag (bottom) |
| Unselected | White bg, no border highlight |
| Selected | Navy radio indicator + brand border/outline |
| Name | Caption 01 Medium, 12px, `#262626` |
| Language | Caption 01 Regular, 12px, `#979797` (e.g. "en") |
| Avatar size | ~56×56px, rounded circle |

---

### Row

A generic list item component with an icon avatar, title, description, and optional chevron.

**Figma node:** `220:26817`

#### Props / Variants

| Prop | Values |
|---|---|
| `possition` | `Top`, `Middle`, `Bottom` |
| `changeTitle` | Title string |
| `changeDescription` | Description string |
| `instance` | Custom icon node (optional) |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 394px |
| Padding (H) | 24px |
| Padding (V) | 16px |
| Avatar size | 52×52px, radius 30px |
| Avatar bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Icon size | 28×28px |
| Bottom border | 1px, `Colors/Border/border-light` → `#e3e3e3` |
| Background | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |

#### Typography & Colors

| Element | Style | Size | Color |
|---|---|---|---|
| Title | Sub Headings 02 Medium | 18px | `#262626` |
| Description | Caption 01 Regular | 12px | `#979797` |

Position variants differ in top padding and whether a top border is shown:
- `Top` — 111px tall, no top border
- `Middle` — 95px tall
- `Bottom` — 95px tall

#### Variant: RowCard

A card-style row used for selecting a security/authentication method (e.g. choosing Recovery Code on the sign-in screen) and for listing active 2FA methods in a security settings summary.

**Single-item RowCard** (method selection):

| Property | Value |
|---|---|
| Background | `#ffffff` |
| Border | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Border radius | 24px (`Radius/3`) |
| Shadow | `shadow-xxl` → `0 25px 50px -12px rgba(32,31,33,0.15)` |
| Padding (H) | 16px |
| Padding (V) | 16px |
| Icon area | 40×40px, `surface-brand - subtler` bg, radius 12px |
| Chevron | 24×24px `chevron_right`, `#979797` |

Example: "Recovery Code — Enter one of your saved recovery codes to sign in"

**List RowCard** (security setup complete summary):

| Property | Value |
|---|---|
| Background | `#ffffff` |
| Border | 1px `Colors/Border/border-light` → `#e3e3e3` |
| Border radius | 12px (`Radius/12`) |
| Header | "Security setup complete" — Body Label 01 SemiBold, 16px, `#262626` |
| Row icon | 24×24px, `surface-brand - subtler` bg, radius 8px |

Each row item: icon + title (Body Label 02 SemiBold, 14px) + description (Caption 01 Regular, 12px, `#979797`) + "Active" status pill (Positive Small V1)

---

### Search

A search input field with a leading search icon, label, and helper text.

**Figma node:** `168:3395`

#### Props / Variants

| Prop | Values |
|---|---|
| `state` | `Default`, `Active`, `Filled`, `Variant4` |
| `showLabel` | boolean |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 348px |
| Input height | ~56px (16px padding) |
| Input bg | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Border radius | 10px (`Radius/m`) |
| Search icon | 24×24px (leading, inside input) |
| Gap (icon → text) | 8px |

#### Typography & Colors

| Element | Style | Size | Color |
|---|---|---|---|
| Label | Body Label 01 Regular | 16px | `#001643` |
| Placeholder | Body Label 01 Regular | 16px | `#979797` |

#### Suggestion Dropdown

When the user types, a suggestion list panel appears below the search input.

| Property | Value |
|---|---|
| Panel bg | `#ffffff` |
| Panel border | 1px `#e3e3e3` |
| Panel border radius | 10px |
| "Suggestion" header | Caption 01 Regular, 12px, `#979797` |
| Item text | Body Label 01 Regular, 16px, `#262626` |
| Selected item | Body Label 01 SemiBold, 16px, `#00287a` |
| Item height | ~44px |

States: unselected list (all items plain) · selected list (one item highlighted navy bold).

---

### Spinner

An animated loading indicator. Classic circular style in multiple sizes and two color themes.

**Figma node:** `62:33204`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Classic` |
| `size` | `Extra Small`, `Small`, `Medium`, `Large`, `Extra Large` |
| `color` | `Base Gray`, `Primary (Brand)` |
| `showText` | boolean |

#### Dimensions

| Size | Spinner area |
|---|---|
| Extra Small | 32×31px |
| Small | ~40px |
| Medium | ~48px |
| Large | ~56px |
| Extra Large | ~80px |

- Gap (spinner → label): 12px
- Label: Body Label 02 Medium, 14px, `#323232`
- Brand color spinner: `#00287a`; Base Gray: `#a6a6a6`.

---

### Status Pills / Filter Chips / Badge

A family of semantic labels and filter controls for displaying state, category, or content type.

**Figma node:** `177:8749`

#### Status Pills

| Prop | Values |
|---|---|
| `type` | `Positive`, `Neutral`, `Negative`, `Warning`, `Info` |
| `size` | `Meduim`, `Small` |
| `version` | `V1` (solid bg), `v2` (dot + text, bordered) |

| Type | Background (V1) | Text color | Border (v2) |
|---|---|---|---|
| Positive | `#5bc48a` (`surface-sucess-subtle`) | `#09984a` | `#09984a` |
| Neutral | light gray | `#5b5b5b` | gray |
| Negative | `#fbeaea` | `#d62b2b` | `#c32727` |
| Warning | `#fffbea` | `#e4c124` | `#e4c124` |
| Info | `#edf3fa` (`surface-brand - subtler`) | `#1059d2` | `#1059d2` |

Dimensions (Medium V1): 95×37px, px 16px, py 8px, radius 48px (`Radius/x4l`).
Dimensions (Small v2): 76×26px, px 8px, py 4px, radius 48px.
Typography: Body Label 02 Medium (14px) for Medium; Caption 01 Medium (12px) for Small.
Shadow: `shadow-xs` → `0 1px 2px rgba(32,31,33,0.05)`.

#### Contact Chips

Pill-style chips used to represent selected contacts or assignees — typically shown below a field after a contact is selected.

| Property | Value |
|---|---|
| Layout | Avatar initials (circle) + label text + × dismiss button |
| Height | ~30px |
| Padding (H) | 8px |
| Background | `Colors/Surface/surface-brand - subtler` → `#edf3fa` |
| Border | 1px `Colors/Border/border-brand` → `#00287a` |
| Border radius | 999px (fully round) |
| Avatar | 20×20px circle, `#00287a` bg, white initials, Caption 01 Medium |
| Label | Caption 01 Medium, 12px, `#00287a` |
| Dismiss (×) | 16×16px close icon, `#00287a` |

#### Filter Chips

| State | Background | Text color |
|---|---|---|
| Default | `Colors/Surface/surface-primary` → `#f6f6f6` | `#999999` |
| Active | `#00287a` | `#ffffff` |
| Pressed | darker bg | `#ffffff` |
| Disabled | `#d6d6d6` | `#a6a6a6` |

Dimensions: 108×37px, px 16px, py 8px, radius 48px.
Shadow: `shadow-s` → `0 1px 3px rgba(32,31,33,0.08)`.
Typography: Body Label 02 Medium, 14px.

#### Badges

| Type | Background | Border | Text |
|---|---|---|---|
| VIP | `#edf3fa` (`surface-brand - subtler`) | `#00287a` | `#00287a`, 14px Medium |
| URGENT | warning surface | warning border | warning text |
| SPAM | danger surface | danger border | danger text |
| LIVE | success surface | success border | success text |

Dimensions: ~78–104×37px, px 16px, py 8px, radius 48px.
Shadow: `shadow-s`.

---

### Stepper

A horizontal progress bar indicating the user's progress through a multi-step flow.

**Figma node:** `168:2932`

#### Props / Variants

| Prop | Values |
|---|---|
| `step` | `"0/4"` through `"4/4"`, `"0/5"` through `"5/5"`, `"0/6"` through `"6/6"`, `"0/7"` through `"7/7"` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 333px |
| Height | 16px |
| Progress bar height | 3px |
| Gap (bar → label) | 8px |
| Label | e.g. `1/7`, `3/5`, `2/4` — current/total format |

#### Colors & Typography

| Element | Style | Color |
|---|---|---|
| Filled portion | `Colors/Typography/text-Brand` → `#00287a` | brand blue |
| Unfilled portion | `Colors/Surface/surface-disabled` → `#d6d6d6` | gray |
| Step label | Caption 01 Medium, 12px | `#00287a` |

---

### Switch / Toggle

A binary on/off control with label and helper text.

**Figma node:** `168:3399`

#### Props / Variants

| Prop | Values |
|---|---|
| `size` | `meduim` (36×20px), `Large` (44×24px) |
| `switch` (propSwitch) | `true` (on), `false` (off) |

#### Dimensions

| Size | Track W×H | Thumb size |
|---|---|---|
| Medium | 36×20px | 16×16px |
| Large | 44×24px | 20×20px |

Track radius: 999px. Padding: 2px.

#### Colors

| State | Track bg | Thumb bg |
|---|---|---|
| On | `Colors/Surface/surface-brand` → `#00287a` | `#ffffff` |
| Off | `Colors/Surface/surface-secondary` → `#e3e3e3` | `#ffffff` |

#### Typography

| Element | Style | Size |
|---|---|---|
| Label | Body Label 01 Regular | 16px |
| Helper text | Caption 01 Regular | 12px |

---

### Toast

A brief feedback notification that appears at the top or bottom of the screen.

**Figma node:** `168:2566`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Error`, `Info`, `Success`, `Warning` |
| `withbutton` | `true`, `false` |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Width | 370px |
| Height (no button) | 40px |
| Height (with button) | 58px |
| Padding (H) | 12px |
| Padding (V) | 8px |
| Border radius | 4px (`Spacing and Radius/Radius/Radius-minimal-500`) |
| Gap (icon → text) | 4px |
| Shadow | `tabs-shadow` → `0 1px 3px rgba(32,31,33,0.05)` |

#### Variant: Standard Toast (status icon)

Default icon per type: ⊗ Error · ⓘ Info · ✓ Success · ⚠ Warning — 16×16px semantic icon.

| Type | Background | Border | Text color |
|---|---|---|---|
| Error | `#fbeaea` | `#c32727` | `#d62b2b` |
| Info | `#edf3fa` (`surface-brand - subtler`) | `#1059d2` | `#1059d2` |
| Success | `#e7f6ee` | `#09984a` | `#09984a` |
| Warning | `#fffbea` | `#e4c124` | `#e4c124` |

#### Variant: Toast With Different Icons

Used for notification-style messages where the leading icon is a custom illustration (e.g. an email envelope icon) rather than the semantic status icon. Includes a multi-line body description below the title.

| Property | Value |
|---|---|
| Leading icon | 20×20px custom icon (e.g. envelope / mail) |
| Width | 370px |
| Height | ~72px (title + body text, 2 lines) |
| Padding (H) | 12px |
| Padding (V) | 12px |
| Border radius | 4px |
| Gap (icon → content) | 8px |

The color scheme (bg, border, text) follows the same type tokens as Standard Toast. Body text uses Caption 01 Regular, 12px, matching the type's text color.

Example: "Two-factor authentication adds a second layer of security to your Hiro account on every sign-in"

#### Typography

| Element | Style | Size |
|---|---|---|
| Message title | Caption 01 Medium | 12px |
| Message body (icon variant) | Caption 01 Regular | 12px |
| Action button label | Caption 01 Medium | 12px, `#00287a` |

---

### Tabs

A horizontal tab bar for switching between views/sections. Also available as a vertical stacked variant.

**Figma node:** `1802:50489`

#### Props / Variants

| Prop | Values |
|---|---|
| `type` | `Horizontal`, `Vertical` |
| `active` | Index of selected tab (0-based) |

#### Dimensions & Layout

| Property | Value |
|---|---|
| Tab bar bg | `#ffffff` |
| Tab bar padding | 4px |
| Active tab | Solid navy pill, white text |
| Inactive tab | No background, `#979797` text |
| Border radius (pill) | 999px (`Radius/max`) |
| Tab min-width | ~80px |
| Tab height | ~34px |

#### States & Colors

| State | Background | Text color |
|---|---|---|
| Active | `#00287a` | `#ffffff` |
| Inactive | transparent | `#979797` |
| Disabled | transparent | `#c3c3c3` |

Typography: Body Label 02 Medium, 14px.

The horizontal variant supports 4–5 tabs in a scrollable row. The vertical variant stacks tabs in a single column, used in settings and detail side-panels.

---

## Icon Library

**Figma page:** `12:104` (🟡Icons)

The app uses **Material Symbols** as its primary icon library, organized into 17 standard categories plus 3 special supplemental sets. Icons are available in outlined and filled variants. All icons are SVG/vector and scalable.

### Standard Icon Sizes

| Size | Usage |
|---|---|
| 12px | Micro icons inside compact chips and badges |
| 16px | Small inline icons (toasts, breadcrumbs, helper text) |
| 20px | Control icons (buttons, inputs, close icons) |
| 24px | Standard UI icons (headers, cards, rows, action buttons) |
| 28px | Navigation icons (Bottom Navigation bar) |

Default color for icons in the UI: `Icons/icon-500` → `#637083`.

Brand-colored icons (highlights, active states): `Colors/Foreground/foreground-brand-primary` → `#00287a`.

Subtle/inactive icons: `Colors/Foreground/foreground-subtle` → `#7c7c7c`.

### Material Symbols Categories

| Category | Figma name | Representative icons |
|---|---|---|
| Action | `Action` | search, settings, home, favorite, share, delete, add, edit, close, check, info, filter, sort, open_in_new |
| Alert | `Alert` | warning, error, notification_important, add_alert |
| Audio & Video | `AV` | play_arrow, pause, stop, mic, mic_off, volume_up, headset, movie, music_note, replay |
| Communication | `Communication` | call, chat, email, message, phone, contact_mail, forum, sms, voicemail, speaker_phone |
| Content | `Content` | add, remove, copy, paste, undo, redo, send, save, archive, flag, report |
| Device | `Device` | battery_full, brightness_high, signal_wifi_4_bar, bluetooth, screen_lock_portrait, memory |
| Editor | `Editor` | format_bold, format_italic, attach_file, insert_photo, text_format, border_color |
| File | `File` | folder, folder_open, attach_file, cloud_upload, cloud_download, file_download, file_upload |
| Hardware | `Hardware` | computer, smartphone, tablet, keyboard, mouse, headset |
| Home | `Home` | home, door_back, lock, security, sensor_window, videocam |
| Image | `Image` | image, photo_camera, palette, crop, filter, rotate_right, zoom_in, broken_image |
| Maps | `Maps` | location_on, place, directions, map, navigation, near_me, gps_fixed, my_location |
| Navigation | `Navigation` | arrow_back, arrow_forward, chevron_right, chevron_left, expand_more, expand_less, menu, close, more_vert, more_horiz |
| Notification | `Notification` | notifications, notifications_active, notifications_off, alarm, event_available |
| Places | `Places` | restaurant, hotel, airport_shuttle, local_hospital, local_pharmacy, business |
| Social | `Social` | person, group, share, star, thumb_up, thumb_down, comment, public, sentiment_satisfied |
| Toggle | `Toggle` | check_box, radio_button_checked, toggle_on, toggle_off, star, star_border |

### Special Icon Sets

#### Status Icons

Semantic icons for UI feedback states. Used inside Toast, Modal, and Card components.

| Icon | State | Color |
|---|---|---|
| `check_circle` | Success | `#09984a` (success-600) |
| `error` / `cancel` | Error / Danger | `#d62b2b` (danger-500) |
| `warning` | Warning | `#e4c124` (warning-600) |
| `info` | Info | `#1059d2` (secondary-500) |

#### Social Media Icons

Platform brand icons for integrations and sharing surfaces.

Includes: Facebook, Instagram, Twitter/X, LinkedIn, YouTube, WhatsApp, Google, Apple.

#### iOS Face ID Icon

iOS-specific biometric authentication icon used in login/security flows.

| Icon | Usage |
|---|---|
| Face ID frame graphic | Shown on iOS login screen for biometric sign-in prompt |

#### Country Flags

Flag icons for the phone country code selector in the `Input Phone` field component. Full international set.

### Icon Usage Rules

- Use **outlined** variants by default; use **filled** variants only for active/selected states (e.g. active bottom nav tab).
- Always pair an icon with a label when the action may be ambiguous; use icon-only when the icon is universally understood (close ×, search, back arrow).
- Icon touch targets should be at minimum 44×44px even if the visual icon is 24px.
- For brand-colored icon containers (e.g. RowCard icon avatar), wrap the 24–28px icon in a 48×48px container with `surface-brand-subtle` (#edf3fa) background and `Radius/icon` (12px) corner radius.

---

## Logo & Brand Assets

**Figma page:** `311:64938` (↪ Logo)

### HiroLabz Logo

The logo is composed of two elements: the **Hiro mascot** (samurai/robotic helmet character in navy, blue, and teal) and the **"HiRO LABZ" wordmark** (bold two-line stack with mixed-case styling).

#### Color Variants

| Variant | Description |
|---|---|
| Full-color | Mascot in full navy/blue/teal palette + colored wordmark — default logo |
| Two-Color | Simplified palette, used on light backgrounds |
| Monochrome | White logo on dark navy (`#00287a`) background |

#### Layout Variants

| Layout | Description |
|---|---|
| Horizontal | Mascot on left, wordmark on right — primary lockup for wide contexts |
| Vertical | Mascot on top, wordmark below — used in square/app icon contexts |

#### Background Contexts

| Context | Usage |
|---|---|
| Light Background | Full-color or two-color logo on white/light surface |
| Dark Background | Monochrome (white) logo on black or navy background |

#### Usage Guidelines

- The mascot (Hiro) is the hero element — always maintain its proportions relative to the wordmark
- The wordmark is a supporting asset, not standalone; always pair with the mascot
- Do not place the full-color logo directly on dark/navy backgrounds — use the monochrome version instead
- Minimum clear space: equal to the height of the "H" in the wordmark on all sides
- Do not recolor, rotate, or distort either element

