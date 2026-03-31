# Crinity Helpdesk Design System

## Overview

This document outlines the design system for Crinity Helpdesk, a customer support ticketing system built with Next.js 15, React 19, TypeScript, Tailwind CSS, and shadcn/ui. The design system ensures consistency, accessibility, and maintainability across the application.

## Design Tokens

### Color Palette

The design system uses HSL-based color tokens defined in `src/app/globals.css`:

| Token                      | HSL Value     | Usage                                |
| -------------------------- | ------------- | ------------------------------------ |
| `--background`             | `0 0% 96%`    | Page background                      |
| `--foreground`             | `240 10% 4%`  | Primary text color                   |
| `--primary`                | `221 83% 53%` | Primary brand color (buttons, links) |
| `--primary-foreground`     | `0 0% 100%`   | Text on primary background           |
| `--secondary`              | `240 5% 96%`  | Secondary backgrounds                |
| `--secondary-foreground`   | `240 6% 10%`  | Text on secondary background         |
| `--destructive`            | `0 84% 60%`   | Error states, destructive actions    |
| `--destructive-foreground` | `0 0% 100%`   | Text on destructive background       |
| `--muted`                  | `240 5% 96%`  | Muted backgrounds                    |
| `--muted-foreground`       | `240 4% 46%`  | Muted text                           |
| `--accent`                 | `240 5% 96%`  | Accent backgrounds                   |
| `--accent-foreground`      | `240 6% 10%`  | Text on accent background            |
| `--border`                 | `240 6% 90%`  | Border colors                        |
| `--input`                  | `240 6% 90%`  | Input field backgrounds              |
| `--ring`                   | `221 83% 53%` | Focus ring color                     |
| `--card`                   | `0 0% 100%`   | Card backgrounds                     |
| `--card-foreground`        | `240 10% 4%`  | Text on cards                        |
| `--popover`                | `0 0% 100%`   | Popover/dropdown backgrounds         |
| `--popover-foreground`     | `240 10% 4%`  | Text in popovers                     |

### Typography

- **Primary Font**: `"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`
- **Font Weight Scale**: Uses Tailwind's default weights (100-900)
- **Font Size Scale**: Uses Tailwind's default sizes (text-xs to text-7xl)

### Border Radius

- **Base Radius**: `0.375rem` (6px) defined as `--radius`
- **Scale**:
  - `lg`: `var(--radius)` (6px)
  - `md`: `calc(var(--radius) - 2px)` (4px)
  - `sm`: `calc(var(--radius) - 4px)` (2px)

## Component Library (shadcn/ui)

### Available Components

The following shadcn/ui components are installed and available:

1. **Button** (`@/components/ui/button`) - Interactive elements
2. **Input** (`@/components/ui/input`) - Text input fields
3. **Textarea** (`@/components/ui/textarea`) - Multi-line text inputs
4. **Select** (`@/components/ui/select`) - Dropdown selections
5. **Checkbox** (`@/components/ui/checkbox`) - Toggle selections
6. **Switch** (`@/components/ui/switch`) - Binary toggles
7. **Label** (`@/components/ui/label`) - Form labels
8. **Card** (`@/components/ui/card`) - Container components
9. **Dialog** (`@/components/ui/dialog`) - Modal dialogs
10. **AlertDialog** (`@/components/ui/alert-dialog`) - Confirmation dialogs
11. **DropdownMenu** (`@/components/ui/dropdown-menu`) - Context menus
12. **Badge** (`@/components/ui/badge`) - Status indicators
13. **Table** (`@/components/ui/table`) - Data tables
14. **Tabs** (`@/components/ui/tabs`) - Tab navigation
15. **Separator** (`@/components/ui/separator`) - Visual dividers

### Component Usage Guidelines

#### Button Component

```tsx
import { Button } from "@/components/ui/button";

// Primary button
<Button>Submit</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Destructive button
<Button variant="destructive">Delete</Button>

// Outline button
<Button variant="outline">Edit</Button>

// Ghost button
<Button variant="ghost">View</Button>

// Link button
<Button variant="link">Learn more</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

#### Input Component

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="user@example.com" />
</div>;
```

#### Form Patterns

Always pair inputs with labels for accessibility:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter your name" />
</div>;
```

## Custom Component Audit

### Components Requiring Migration to shadcn/ui

The following custom components use raw HTML elements instead of shadcn/ui components and should be migrated:

#### 1. Ticket Form Components

- **File**: `src/components/ticket/ticket-form.tsx`
- **Issues**: Uses raw `<input>`, `<select>`, `<textarea>`, and `<button>` elements
- **Migration Targets**:
  - Raw `<input>` → `Input` component
  - Raw `<select>` → `Select` component
  - Raw `<textarea>` → `Textarea` component
  - Raw `<button>` → `Button` component

- **File**: `src/components/ticket/ticket-lookup-form.tsx`
- **Issues**: Uses raw `<input>` and `<button>` elements
- **Migration Targets**:
  - Raw `<input>` → `Input` component
  - Raw `<button>` → `Button` component

#### 2. Other Ticket Components

- **File**: `src/components/ticket/customer-reply-form.tsx` (needs verification)
- **File**: `src/components/ticket/attachment-upload.tsx` (needs verification)

### Components Using shadcn/ui Correctly

#### 1. Admin Components

- `src/components/admin/llm-settings-form.tsx` - Uses `Button`, `Card`, `Input`, `Label`, `Switch`, `Textarea`
- Other admin components likely follow similar patterns

#### 2. App Shell Components

- Shell components appear to use appropriate shadcn/ui patterns

## Migration Guidelines

### Priority 1: Ticket Form Components

These are customer-facing and have the most visual impact:

1. **Update `ticket-form.tsx`**:
   - Replace all `<input>` elements with `Input` component
   - Replace `<select>` elements with `Select` component
   - Replace `<textarea>` with `Textarea` component
   - Replace `<button>` with `Button` component
   - Ensure proper `Label` usage for all form fields

2. **Update `ticket-lookup-form.tsx`**:
   - Replace `<input>` with `Input` component
   - Replace `<button>` with `Button` component

### Priority 2: Other Public-Facing Forms

Audit and update any remaining public-facing forms that use raw HTML elements.

### Priority 3: Internal Admin Components

Verify all admin components use shadcn/ui consistently.

## Accessibility Compliance

### Current Issues Identified

1. **Missing autocomplete attributes** on form fields
2. **Inconsistent focus states** between custom and shadcn/ui components
3. **Missing aria-live regions** for dynamic content
4. **Missing skip links** for keyboard navigation

### Required Fixes

1. Add `autocomplete` attributes to all form fields
2. Ensure consistent focus rings using `focus-visible:ring-2 focus-visible:ring-ring`
3. Add aria-live regions for loading states and notifications
4. Implement skip links for main content navigation

## Mobile Responsiveness

### Current Status

- Good foundation with Tailwind's responsive utilities
- Grid layouts use `grid-cols-1 md:grid-cols-2` patterns
- Touch targets need verification (minimum 44×44px)

### Required Improvements

1. Verify all interactive elements have adequate touch targets
2. Ensure form fields are easily tappable on mobile
3. Test keyboard navigation on touch devices

## Implementation Roadmap

### Week 1-2: Design System Consolidation

1. Migrate ticket form components to shadcn/ui
2. Update all form patterns to use consistent `Label` + `Input` pairs
3. Document component usage patterns

### Week 3-4: Accessibility Improvements

1. Add autocomplete attributes to all forms
2. Implement consistent focus states
3. Add aria-live regions and skip links

### Week 5-6: Mobile Optimization

1. Verify and improve touch targets
2. Optimize form layouts for mobile
3. Test keyboard navigation

### Week 7-8: Polish and Documentation

1. Create component usage examples
2. Document design decisions
3. Train team on design system usage

## File Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── ticket/          # Ticket-related components
│   ├── admin/           # Admin interface components
│   └── app/             # App shell components
├── app/
│   └── globals.css      # Design tokens
└── tailwind.config.ts   # Tailwind configuration
```

## Development Guidelines

### Do's

- ✅ Always use shadcn/ui components for UI elements
- ✅ Pair form inputs with `Label` components
- ✅ Use design tokens (CSS variables) for colors
- ✅ Follow mobile-first responsive patterns
- ✅ Test keyboard navigation and screen readers

### Don'ts

- ❌ Don't use raw HTML elements for UI (input, button, select, textarea)
- ❌ Don't use inline styles for colors or spacing
- ❌ Don't create custom components that duplicate shadcn/ui functionality
- ❌ Don't skip accessibility testing

## Testing Checklist

### Visual Consistency

- [ ] All buttons use shadcn/ui `Button` component
- [ ] All form inputs use shadcn/ui `Input`, `Select`, `Textarea`
- [ ] Consistent border radius (6px default)
- [ ] Consistent spacing (Tailwind spacing scale)

### Accessibility

- [ ] All form fields have associated labels
- [ ] Focus states visible and consistent
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Keyboard navigation works end-to-end

### Responsiveness

- [ ] Layout adapts to mobile screens
- [ ] Touch targets are at least 44×44px
- [ ] Text remains readable on small screens

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Vercel Design Guidelines](https://vercel.com/design)
