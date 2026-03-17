

## Add Canvas Start Page (Zone Picker)

### Overview
Insert a new "start" screen at `/canvas` that lets canvassers pick a zone before entering the card-based review flow. The existing card review moves to `/canvas/review`.

### Changes

**New file: `src/pages/CanvasStartPage.tsx`**
- Full-page screen with heading "Start Canvassing"
- Fetches zones from database, displays them as selectable cards (name + location count via a count query)
- An "All Locations" option for no zone filter
- "Start" button navigates to `/canvas/review?zone={selectedZoneId}` (preserving any existing type/assign params if added later)

**`src/App.tsx`**
- Import `CanvasStartPage`
- Change `/canvas` route to render `CanvasStartPage`
- Add `/canvas/review` route rendering the existing `CanvasPage`

**`src/pages/CanvasPage.tsx`**
- No functional changes — it already reads `zone` from search params
- Update the "Back to Locations" button to go back to `/canvas` instead of `/locations`

**`src/pages/Locations.tsx`**
- Update Canvas button to navigate to `/canvas` (no query params — the start page handles selection)

