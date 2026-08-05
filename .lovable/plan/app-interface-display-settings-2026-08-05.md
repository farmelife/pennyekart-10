# App Interface Display Settings

Add a new "Interface & Display" area to `/admin/settings` where admins set the default look and feel of the customer app. Customers can still override theme and lite mode from their own device; everything else follows the admin defaults.

## What the admin gets

A new tabbed/grouped panel on the App Settings page with four cards:

**1. Homepage sections**
On/off switches for each homepage block: Penny Carbs food strip, cart reminder, flash sale banner, category bar, sort/filter bar, banner carousel, scratch & win widget, grocery categories, combo offers, product video row. Sections already hide themselves when empty; these switches let admins hide them even when data exists.

**2. Layout density & grid**
- Products per row on mobile (2-3) and desktop (3-6)
- Card size: compact / standard / large
- Spacing: compact / comfortable

**3. Theme & branding**
- Default theme: light / dark / follow device
- Accent color preset (mapped to existing design tokens, no hardcoded hex in components)
- App display name and logo upload

**4. Lite mode & performance**
- Default lite mode on/off (customer can still toggle)
- Reduce animations
- Image quality: high / balanced / data saver
- Lazy-load images on/off

Each card saves independently with a toast, plus a "Reset to defaults" action.

## Customer side behaviour

The customer app reads these values once on load and applies them as defaults. If a customer has previously chosen a theme or lite mode on their device, their local choice wins. Layout, section visibility and performance options always follow the admin values.

## Technical notes

- Values persist in the existing `app_settings` table as one JSON row under key `ui_display_settings` (single row, no migration to table structure needed) — avoids adding ~15 individual keys.
- New `src/hooks/useDisplaySettings.tsx` provider: fetches the row via react-query, exposes typed settings with hardcoded fallbacks, and is mounted in `src/App.tsx` above the router.
- `useLiteMode` gains an "admin default" input: it keeps using `pennyekart_lite_mode` in localStorage when present, otherwise falls back to the admin default. Same pattern for theme.
- New `src/components/admin/DisplaySettingsPanel.tsx` (split into small sub-cards) rendered inside `src/pages/admin/AppSettingsPage.tsx`; existing Penny Carbs and app-download cards stay untouched.
- `src/pages/Index.tsx` wraps each optional block in a visibility check from the hook; `ProductRow` and grid components read density/columns from the hook instead of fixed classes.
- Accent color applied by setting CSS custom properties on `:root` from the token presets defined in `src/index.css` — no inline color utilities added to components.
- Logo upload reuses the existing `ImageUpload` admin component and Supabase storage.
