# Mobile Optimization Design

## Goal
Optimize the homepage and typing practice page for mobile viewports so visitors get a good first impression, even though typing practice is desktop-focused.

## Changes

### 1. Homepage Header (mobile < md)
- Row 1: Logo + title (left), UserMenu (right)
- Row 2: Collection selector + language selector side-by-side
- Language selector: reduce min-width, show compact text

### 2. Stats Panel (typing page, mobile < md)
- Replace 2x2 card grid with a single-row inline toolbar
- No card borders/shadows on mobile - just colored text values
- Format: `01:23  CPM 186  WPM 37  98%`

### 3. Results Section (typing page completion, mobile < md)
- Same inline compact layout for result stats
- Same inline layout for personal best comparison
- Chart height: 250px -> 180px on mobile
- Reduce container padding from p-8 to p-4

### 4. Practice Page Header
- Limit title width with truncation to prevent overlap with back button

### 5. Homepage Hero
- Font size: 3rem -> 1.5rem on mobile
- Top padding: 25vh -> 15vh on mobile
- Bottom margin on subtitle: mb-24 -> mb-12 on mobile

## Breakpoint Strategy
- All changes use `md:` (768px) breakpoint, consistent with existing patterns
- Mobile-first: compact defaults, expand at md+

## Files to Modify
1. `src/pages/HomePage.tsx` - Header layout + hero sizing
2. `src/components/typing/StatsPanel.tsx` - Compact inline stats
3. `src/components/typing/TypingArea.tsx` - Results section + padding
4. `src/components/typing/RecentActivityChart.tsx` - Chart height
5. `src/components/lesson/LessonPractice.tsx` - Practice header title truncation
