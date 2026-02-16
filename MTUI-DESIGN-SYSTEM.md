# MTUI Design System Documentation

> **Source**: [MTUI Storybook on Chromatic](https://master--65eadc750fc5531e6017bf9d.chromatic.com/)
> 
> **Last Updated**: 2026-02-15
> 
> This document catalogs all design tokens and components from the Mailtrap MTUI design system.

---

## 📋 Table of Contents

1. [Sidebar Navigation Structure](#sidebar-navigation-structure)
2. [Design Tokens](#design-tokens)
   - [Border Radii](#border-radii)
   - [Colors](#colors)
   - [Typography](#typography)
   - [Spacing](#spacing)
   - [Shadows](#shadows)
   - [Other Tokens](#other-tokens)
3. [Components](#components)
4. [Implementation Status](#implementation-status)

---

## Sidebar Navigation Structure

> **TODO**: Document the complete sidebar structure from the Storybook

### Expected Sections
- [ ] Tokens
  - [ ] Border Radii
  - [ ] Colors
  - [ ] Typography
  - [ ] Spacing
  - [ ] Shadows
  - [ ] Breakpoints
  - [ ] Z-Index
  - [ ] Transitions
- [ ] Components
  - [ ] Buttons
  - [ ] Inputs
  - [ ] Tables
  - [ ] Cards
  - [ ] Modals
  - [ ] Dropdowns
  - [ ] Navigation
  - [ ] Forms
  - [ ] Badges
  - [ ] Tooltips
  - [ ] etc.

### Actual Sidebar Structure (from Storybook)
```
TODO: Copy the exact sidebar navigation tree here
```

---

## Design Tokens

### Border Radii

**Storybook URL**: https://master--65eadc750fc5531e6017bf9d.chromatic.com/?path=/docs/tokens-borderradii--docs

| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| `border-radius-1` | `?px` | TODO | ❌ Not documented |
| `border-radius-2` | `?px` | TODO | ❌ Not documented |
| `border-radius-3` | `?px` | TODO | ❌ Not documented |

**Current Implementation** (from `tailwind.config.ts`):
```typescript
borderRadius: {
  'mtui': '7px',      // buttons, nav items, cards
  'mtui-input': '6px', // inputs, selects
  'mtui-table': '6px'  // table containers
}
```

**Notes**:
- TODO: Verify these values match the Storybook
- TODO: Check if there are additional radius values

---

### Colors

**Storybook URL**: `?path=/docs/tokens-colors--docs` (TODO: verify exact path)

#### Blue Palette (Primary)
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `blue-50` | `#F2F7FF` | Lightest blue background | ✅ Implemented |
| `blue-100` | `#CEDEFF` | Light blue background | ✅ Implemented |
| `blue-200` | `#93B7FC` | Medium light blue | ✅ Implemented |
| `blue-300` | `#5D93FC` | Medium blue | ✅ Implemented |
| `blue-400` | `#4C83EE` | Primary action color | ✅ Implemented |
| `blue-500` | `#3465C3` | Primary hover | ✅ Implemented |
| `blue-600` | `#2B55A9` | Primary pressed | ✅ Implemented |
| `blue-700` | `#1A2E44` | Dark blue text | ✅ Implemented |

**TODO**: Verify all color palettes from Storybook:
- [ ] Blue palette
- [ ] Grey palette
- [ ] Navy palette
- [ ] Red palette (danger/error)
- [ ] Orange palette (warning)
- [ ] Green palette (success)
- [ ] Yellow palette (if exists)
- [ ] Purple palette (if exists)
- [ ] Semantic color aliases

#### Grey Palette
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `grey-50` | `#F9FBFB` | TODO | ✅ Implemented |
| `grey-100` | `#F8FAFA` | TODO | ✅ Implemented |
| `grey-200` | `#EEEEEE` | TODO | ✅ Implemented |
| `grey-300` | `#DFE3EA` | TODO | ✅ Implemented |
| `grey-400` | `#A3ABB4` | TODO | ✅ Implemented |
| `grey-500` | `#647A93` | TODO | ✅ Implemented |

#### Navy Palette (Dark Mode)
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `navy-50` | `#D0D3D8` | TODO | ✅ Implemented |
| `navy-100` | `#687A91` | TODO | ✅ Implemented |
| `navy-200` | `#4D5A6A` | TODO | ✅ Implemented |
| `navy-300` | `#2A394B` | TODO | ✅ Implemented |
| `navy-400` | `#212D3C` | TODO | ✅ Implemented |
| `navy-500` | `#172230` | TODO | ✅ Implemented |
| `navy-600` | `#141E2A` | TODO | ✅ Implemented |
| `navy-700` | `#131E2B` | TODO | ✅ Implemented |
| `navy-800` | `#101A26` | TODO | ✅ Implemented |
| `navy-900` | `#0D233B` | TODO | ✅ Implemented |

#### Red Palette (Danger/Error)
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `red-50` | `#FFF1F1` | TODO | ✅ Implemented |
| `red-100` | `#F4D8D8` | TODO | ✅ Implemented |
| `red-200` | `#FF7171` | TODO | ✅ Implemented |
| `red-300` | `#FB5151` | TODO | ✅ Implemented |
| `red-400` | `#E73939` | TODO | ✅ Implemented |
| `red-500` | `#D90000` | TODO | ✅ Implemented |

#### Orange Palette (Warning)
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `orange-50` | `#FFF8EF` | TODO | ✅ Implemented |
| `orange-100` | `#F9E4C1` | TODO | ✅ Implemented |
| `orange-200` | `#FCBB5D` | TODO | ✅ Implemented |
| `orange-300` | `#FFA726` | TODO | ✅ Implemented |
| `orange-400` | `#DB7D15` | TODO | ✅ Implemented |
| `orange-500` | `#B05E18` | TODO | ✅ Implemented |

#### Green Palette (Success)
| Token Name | Hex Value | Usage | Status |
|------------|-----------|-------|--------|
| `green-50` | `#ECFFF5` | TODO | ✅ Implemented |
| `green-100` | `#B6FFC8` | TODO | ✅ Implemented |
| `green-200` | `#45E890` | TODO | ✅ Implemented |
| `green-300` | `#22D172` | TODO | ✅ Implemented |
| `green-400` | `#16BD62` | TODO | ✅ Implemented |
| `green-500` | `#088843` | TODO | ✅ Implemented |

#### Semantic Colors
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| `primary` | `#4C83EE` | Primary action color | ✅ Implemented |
| `primary-hover` | `#3465C3` | Primary hover state | ✅ Implemented |
| `primary-pressed` | `#2B55A9` | Primary pressed state | ✅ Implemented |
| `surface` | `#FFFFFF` | Default surface | ✅ Implemented |
| `surface-secondary` | `#F8FAFA` | Secondary surface | ✅ Implemented |
| `surface-dark` | `#131E2B` | Dark mode surface | ✅ Implemented |
| `surface-dark-secondary` | `#172230` | Dark mode secondary surface | ✅ Implemented |
| `stroke` | `#DFE3EA` | Default border/stroke | ✅ Implemented |
| `stroke-dark` | `#2A394B` | Dark mode border/stroke | ✅ Implemented |

---

### Typography

**Storybook URL**: `?path=/docs/tokens-typography--docs` (TODO: verify exact path)

#### Font Families
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| `font-sans` | `Inter, -apple-system, BlinkMacSystemFont, ...` | Default UI font | ✅ Implemented |
| `font-mono` | `Menlo, Monaco, Consolas, ...` | Code font | ✅ Implemented |

#### Headings
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `heading-1` | 22px | 26.63px | -0.44px | 600 | ✅ Implemented |
| `heading-2` | 16px | 19.36px | -0.32px | 600 | ✅ Implemented |
| `heading-3` | 14px | 16.94px | -0.28px | 600 | ✅ Implemented |
| `heading-4` | 13px | 15.73px | -0.26px | 600 | ✅ Implemented |

#### Body Text
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `body-l` | 16px | 22px | -0.32px | 400 | ✅ Implemented |
| `body` | 14px | 19.32px | -0.28px | 400 | ✅ Implemented |
| `body-m` | 13px | 17.94px | -0.26px | 400 | ✅ Implemented |
| `body-s` | 12px | 16.56px | -0.24px | 400 | ✅ Implemented |

#### Labels
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `button-label` | 14px | 19.32px | -0.28px | 500 | ✅ Implemented |
| `item-label` | 14px | 19.32px | -0.28px | 500 | ✅ Implemented |
| `item-label-m` | 13px | 17.94px | -0.26px | 500 | ✅ Implemented |
| `item-label-s` | 12px | 16.56px | -0.24px | 500 | ✅ Implemented |

#### Bold Variants
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `bold-base` | 14px | 19.32px | -0.28px | 600 | ✅ Implemented |
| `bold-sm` | 13px | 17.94px | -0.26px | 600 | ✅ Implemented |
| `bold-xs` | 12px | 16.56px | -0.24px | 600 | ✅ Implemented |

#### Navigation & Tabs
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `nav-item` | 13px | 17.94px | -0.26px | 500 | ✅ Implemented |
| `nav-item-active` | 13px | 17.94px | -0.26px | 600 | ✅ Implemented |
| `tab` | 13px | 17.94px | -0.26px | 500 | ✅ Implemented |

#### Specialized
| Token Name | Size | Line Height | Letter Spacing | Weight | Status |
|------------|------|-------------|----------------|--------|--------|
| `email-default` | 14px | 19.32px | -0.28px | 600 | ✅ Implemented |
| `email-active` | 14px | 19.32px | -0.28px | 700 | ✅ Implemented |
| `email-read` | 14px | 19.32px | -0.28px | 400 | ✅ Implemented |
| `code` | 14px | 20px | 0px | 400 | ✅ Implemented |
| `card-number` | 22px | 22px | 0px | 500 | ✅ Implemented |

**TODO**: Verify all typography tokens from Storybook

---

### Spacing

**Storybook URL**: `?path=/docs/tokens-spacing--docs` (TODO: verify exact path)

| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| `spacing-1` | `?px` | TODO | ❌ Not documented |
| `spacing-2` | `?px` | TODO | ❌ Not documented |

**Current Custom Spacing** (from `tailwind.config.ts`):
```typescript
spacing: {
  '4.5': '18px',
  '7': '28px',
  '7.5': '30px',
  '8.5': '34px',
  '13': '52px'
}
```

**TODO**: 
- [ ] Document complete spacing scale from Storybook
- [ ] Verify if Tailwind's default spacing (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64) aligns with MTUI
- [ ] Check for component-specific spacing tokens (padding, gaps, etc.)

---

### Shadows

**Storybook URL**: `?path=/docs/tokens-shadows--docs` (TODO: verify exact path)

| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| `shadow-box` | `0 2px 4px rgba(66, 73, 100, 0.10)` | Cards, boxes | ✅ Implemented |
| `shadow-tooltip` | `0 4px 8px rgba(66, 73, 100, 0.10)` | Tooltips | ✅ Implemented |
| `shadow-dropdown` | `0 6px 12px rgba(66, 73, 100, 0.10)` | Dropdowns, menus | ✅ Implemented |
| `shadow-modal` | `0 8px 16px rgba(66, 73, 100, 0.10)` | Modals, dialogs | ✅ Implemented |

**TODO**: Verify shadow tokens from Storybook

---

### Other Tokens

**TODO**: Document additional token categories found in Storybook:

#### Breakpoints
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| TODO | TODO | TODO | ❌ Not documented |

#### Z-Index
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| TODO | TODO | TODO | ❌ Not documented |

#### Transitions/Animations
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| TODO | TODO | TODO | ❌ Not documented |

#### Opacity
| Token Name | Value | Usage | Status |
|------------|-------|-------|--------|
| TODO | TODO | TODO | ❌ Not documented |

---

## Components

### Button

**Storybook URL**: `?path=/docs/components-button--docs` (TODO: verify exact path)

#### Variants
- [ ] Primary
- [ ] Secondary
- [ ] Tertiary
- [ ] Danger
- [ ] Ghost
- [ ] Link

#### Sizes
- [ ] Small
- [ ] Medium
- [ ] Large

#### States
- [ ] Default
- [ ] Hover
- [ ] Active/Pressed
- [ ] Disabled
- [ ] Loading

#### Props/API
```typescript
// TODO: Document from Storybook
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  // ... other props
}
```

#### Design Specs
- **Height**: TODO
- **Padding**: TODO
- **Border Radius**: `7px` (mtui)
- **Font**: `button-label` (14px, 500 weight)
- **Icon Spacing**: TODO

---

### Input/TextField

**Storybook URL**: `?path=/docs/components-input--docs` (TODO: verify exact path)

#### Variants
- [ ] Default
- [ ] With Icon
- [ ] With Prefix/Suffix
- [ ] Textarea

#### States
- [ ] Default
- [ ] Focus
- [ ] Error
- [ ] Disabled
- [ ] Read-only

#### Design Specs
- **Height**: TODO
- **Padding**: TODO
- **Border Radius**: `6px` (mtui-input)
- **Border Color**: `stroke` (#DFE3EA)
- **Focus Ring**: TODO

---

### Table

**Storybook URL**: `?path=/docs/components-table--docs` (TODO: verify exact path)

#### Features
- [ ] Sortable columns
- [ ] Row selection
- [ ] Pagination
- [ ] Row actions
- [ ] Empty state

#### Design Specs
- **Border Radius**: `6px` (mtui-table)
- **Row Height**: TODO
- **Header Height**: TODO
- **Cell Padding**: TODO
- **Border Color**: TODO

---

### Card

**Storybook URL**: `?path=/docs/components-card--docs` (TODO: verify exact path)

#### Variants
- [ ] Default
- [ ] With Header
- [ ] With Footer
- [ ] Clickable

#### Design Specs
- **Border Radius**: `7px` (mtui)
- **Padding**: TODO
- **Shadow**: `mtui-box` (0 2px 4px rgba(66, 73, 100, 0.10))
- **Border**: TODO

---

### Modal/Dialog

**Storybook URL**: `?path=/docs/components-modal--docs` (TODO: verify exact path)

#### Variants
- [ ] Default
- [ ] Confirmation
- [ ] Form
- [ ] Full-screen

#### Design Specs
- **Border Radius**: TODO
- **Shadow**: `mtui-modal` (0 8px 16px rgba(66, 73, 100, 0.10))
- **Backdrop**: TODO
- **Max Width**: TODO

---

### Dropdown/Select

**Storybook URL**: `?path=/docs/components-dropdown--docs` (TODO: verify exact path)

#### Features
- [ ] Single select
- [ ] Multi-select
- [ ] Searchable
- [ ] With icons
- [ ] Grouped options

#### Design Specs
- **Border Radius**: TODO
- **Shadow**: `mtui-dropdown` (0 6px 12px rgba(66, 73, 100, 0.10))
- **Max Height**: TODO
- **Item Height**: TODO

---

### Navigation

**Storybook URL**: `?path=/docs/components-navigation--docs` (TODO: verify exact path)

#### Components
- [ ] Sidebar
- [ ] Tabs
- [ ] Breadcrumbs
- [ ] Pagination

#### Design Specs
- **Nav Item Height**: TODO
- **Active Indicator**: TODO
- **Hover State**: TODO
- **Font**: `nav-item` (13px, 500 weight)
- **Active Font**: `nav-item-active` (13px, 600 weight)

---

### Badge

**Storybook URL**: `?path=/docs/components-badge--docs` (TODO: verify exact path)

#### Variants
- [ ] Default
- [ ] Success
- [ ] Warning
- [ ] Error
- [ ] Info

#### Sizes
- [ ] Small
- [ ] Medium
- [ ] Large

---

### Tooltip

**Storybook URL**: `?path=/docs/components-tooltip--docs` (TODO: verify exact path)

#### Design Specs
- **Border Radius**: TODO
- **Shadow**: `mtui-tooltip` (0 4px 8px rgba(66, 73, 100, 0.10))
- **Padding**: TODO
- **Font**: TODO
- **Arrow**: TODO

---

### Other Components

**TODO**: Document additional components found in Storybook:

- [ ] Alert/Toast
- [ ] Checkbox
- [ ] Radio
- [ ] Switch/Toggle
- [ ] Progress Bar
- [ ] Spinner/Loader
- [ ] Avatar
- [ ] Icon Button
- [ ] Chip
- [ ] Accordion
- [ ] Stepper
- [ ] Date Picker
- [ ] Time Picker
- [ ] File Upload
- [ ] Search
- [ ] Empty State
- [ ] Error State
- [ ] Loading State

---

## Implementation Status

### ✅ Fully Implemented
- Color palettes (Blue, Grey, Navy, Red, Orange, Green)
- Typography system (Headings, Body, Labels, etc.)
- Border radii (buttons, inputs, tables)
- Shadows (box, tooltip, dropdown, modal)
- Custom spacing values

### ⚠️ Partially Implemented
- Components (some exist, but need verification against Storybook)

### ❌ Not Yet Implemented
- Complete spacing scale documentation
- Breakpoints
- Z-index scale
- Transitions/animations
- Opacity scale
- All component variants and states

---

## How to Use This Document

1. **Open the Storybook**: https://master--65eadc750fc5531e6017bf9d.chromatic.com/
2. **Navigate through each section** in the sidebar
3. **Take screenshots** of each page (especially token pages)
4. **Fill in the TODO sections** above with exact values from Storybook
5. **Document any additional tokens or components** not listed here
6. **Update the implementation status** as you verify each item

---

## Next Steps

1. [ ] Complete border radii documentation
2. [ ] Verify all color palettes
3. [ ] Verify typography tokens
4. [ ] Document complete spacing scale
5. [ ] Document all shadow tokens
6. [ ] Document breakpoints, z-index, transitions
7. [ ] Document all component variants and states
8. [ ] Create component implementation checklist
9. [ ] Update `tailwind.config.ts` with any missing tokens
10. [ ] Create component library aligned with MTUI Storybook

---

**Last Updated**: 2026-02-15
**Maintainer**: Mailtrap Desktop Team
