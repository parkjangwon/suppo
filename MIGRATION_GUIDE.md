# Design System Migration Guide

## Overview

This guide provides step-by-step instructions for migrating custom UI components to use shadcn/ui components consistently throughout the Suppo Helpdesk application.

## Priority 1: Ticket Form Components

### 1. `src/components/ticket/ticket-form.tsx`

#### Current Issues

- Uses raw `<input>`, `<select>`, `<textarea>`, and `<button>` elements
- Inconsistent styling with Tailwind classes
- Missing proper accessibility attributes

#### Migration Steps

**Step 1: Update Imports**

```tsx
// Add these imports at the top of the file
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

**Step 2: Replace Input Fields**

```tsx
// BEFORE (lines 80-89):
<input
  id="customerName"
  type="text"
  {...register("customerName")}
  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none transition-all"
  style={{
    focusRing: branding.primaryColor
  }}
  placeholder="홍길동"
/>

// AFTER:
<Input
  id="customerName"
  type="text"
  {...register("customerName")}
  placeholder="홍길동"
/>
```

**Step 3: Replace Select Fields**

```tsx
// BEFORE (lines 150-161):
<select
  id="requestTypeId"
  {...register("requestTypeId")}
  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all bg-white"
>
  <option value="">선택해주세요</option>
  {requestTypes.map((type) => (
    <option key={type.id} value={type.id}>
      {type.name}
    </option>
  ))}
</select>

// AFTER:
<Select onValueChange={(value) => setValue("requestTypeId", value)}>
  <SelectTrigger>
    <SelectValue placeholder="선택해주세요" />
  </SelectTrigger>
  <SelectContent>
    {requestTypes.map((type) => (
      <SelectItem key={type.id} value={type.id}>
        {type.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Step 4: Replace Textarea**

```tsx
// BEFORE (lines 207-213):
<textarea
  id="description"
  {...register("description")}
  rows={5}
  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all resize-y"
  placeholder="문의 내용을 상세히 입력해주세요 (최소 20자)"
/>

// AFTER:
<Textarea
  id="description"
  {...register("description")}
  placeholder="문의 내용을 상세히 입력해주세요 (최소 20자)"
  className="min-h-[120px]"
/>
```

**Step 5: Replace Submit Button**

```tsx
// BEFORE (lines 230-244):
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full py-4 px-6 text-base font-medium text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
  style={{ backgroundColor: branding.primaryColor }}
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      제출 중...
    </>
  ) : (
    "티켓 제출"
  )}
</button>

// AFTER:
<Button
  type="submit"
  disabled={isSubmitting}
  className="w-full py-4 px-6 text-base font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all"
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      제출 중...
    </>
  ) : (
    "티켓 제출"
  )}
</Button>
```

**Step 6: Update Form Structure**
Ensure each form field follows the pattern:

```tsx
<div className="space-y-2">
  <Label htmlFor="fieldId">Field Label</Label>
  <Input id="fieldId" {...register("fieldName")} />
  {errors.fieldName && (
    <p className="text-sm text-red-500">{errors.fieldName.message}</p>
  )}
</div>
```

### 2. `src/components/ticket/ticket-lookup-form.tsx`

#### Migration Steps

**Step 1: Update Imports**

```tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
```

**Step 2: Replace Input Fields**

```tsx
// BEFORE (lines 53-61):
<input
  id="ticketNumber"
  type="text"
  value={ticketNumber}
  onChange={(e) => setTicketNumber(e.target.value)}
  placeholder="CRN-YYYYMMDD-XXXX"
  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all uppercase"
  required
/>

// AFTER:
<Input
  id="ticketNumber"
  type="text"
  value={ticketNumber}
  onChange={(e) => setTicketNumber(e.target.value)}
  placeholder="CRN-YYYYMMDD-XXXX"
  className="uppercase"
  required
/>
```

**Step 3: Replace Submit Button**

```tsx
// BEFORE (lines 77-94):
<button
  type="submit"
  className="w-full py-4 px-6 text-base font-medium text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-2"
  style={{ backgroundColor: branding.primaryColor }}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      검색 중...
    </>
  ) : (
    "티켓 조회"
  )}
</button>

// AFTER:
<Button
  type="submit"
  className="w-full py-4 px-6 text-base font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all mt-2"
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      검색 중...
    </>
  ) : (
    "티켓 조회"
  )}
</Button>
```

## Priority 2: Other Ticket Components

### 3. `src/components/ticket/customer-reply-form.tsx`

**Check for**: Raw HTML elements that should be replaced with shadcn/ui components.

### 4. `src/components/ticket/attachment-upload.tsx`

**Check for**: Custom file upload implementation that might benefit from shadcn/ui patterns.

## Priority 3: Verification of Admin Components

### 5. Review All Admin Components

Verify that all components in `src/components/admin/` use shadcn/ui components consistently. The `llm-settings-form.tsx` serves as a good reference.

## Testing Checklist

### After Migration

- [ ] Form submission still works correctly
- [ ] Validation errors display properly
- [ ] Loading states work as expected
- [ ] All form fields are accessible via keyboard
- [ ] Focus states are visible and consistent
- [ ] Mobile responsiveness is maintained
- [ ] Brand colors are applied correctly

### Visual Regression Testing

- [ ] Compare before/after screenshots of forms
- [ ] Verify consistent spacing and alignment
- [ ] Check color contrast meets WCAG standards
- [ ] Ensure touch targets are adequate (44×44px minimum)

## Common Issues and Solutions

### Issue 1: React Hook Form Integration

**Problem**: `register()` function doesn't work directly with shadcn/ui components
**Solution**: Use `{...register("fieldName")}` for Input/Textarea, use `onValueChange` for Select

### Issue 2: Custom Styling Needs

**Problem**: Need to maintain custom styles (like hover effects)
**Solution**: Use `className` prop to add custom Tailwind classes

### Issue 3: Brand Color Integration

**Problem**: Custom button colors using `branding.primaryColor`
**Solution**: Update the design tokens in `globals.css` to use brand colors, or use inline styles sparingly

### Issue 4: Accessibility Attributes

**Problem**: Missing `aria-*` attributes
**Solution**: Add appropriate aria attributes based on component state

## Rollout Strategy

### Phase 1: Development Environment

1. Create a feature branch for migration
2. Update one component at a time
3. Test thoroughly after each update
4. Get design review for visual changes

### Phase 2: Staging Environment

1. Deploy to staging environment
2. Conduct user acceptance testing
3. Test with screen readers and keyboard navigation
4. Verify mobile responsiveness

### Phase 3: Production Deployment

1. Deploy during low-traffic period
2. Monitor for any regression issues
3. Have rollback plan ready
4. Document changes for team reference

## Post-Migration Tasks

### 1. Update Documentation

- Update `DESIGN_SYSTEM.md` with new patterns
- Add component usage examples
- Document any design decisions

### 2. Team Training

- Conduct workshop on shadcn/ui usage
- Share migration learnings
- Establish code review checklist

### 3. Ongoing Maintenance

- Add design system checks to CI/CD pipeline
- Schedule regular accessibility audits
- Monitor for component drift

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Hook Form Integration Guide](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Web Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
