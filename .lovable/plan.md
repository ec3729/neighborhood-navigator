

## Add "Canvas" Mode for Location Review

Create a full-screen, card-based review flow that lets users step through locations one at a time, verify the data, and optionally update fields inline before moving to the next record.

### How It Works

1. User clicks a **"Canvas"** button on the Locations page (next to Add Location)
2. Opens a new page (`/canvas`) showing one location at a time as a large card
3. The card displays: name, address, type, status, assigned surveyor, and coordinates
4. User can either:
   - Click **"Looks Good"** to confirm and move to the next location
   - Edit any field inline and click **"Save & Next"** to update and advance
   - Click **"Skip"** to move on without changes
5. A progress bar at the top shows how many locations have been reviewed
6. When all locations are reviewed, a summary screen shows counts of confirmed vs. updated records

### What Gets Built

**New file: `src/pages/CanvasPage.tsx`**
- Fetches all locations (respects current filters passed via URL search params or reviews all)
- Maintains a `currentIndex` state to track position in the list
- Displays an editable card with fields: name, address, location_type, status
- "Looks Good" button marks as reviewed (local tracking only, no DB column needed)
- "Save & Next" button updates the location in the database, then advances
- "Skip" button advances without action
- Progress bar using the existing Progress component
- Summary card at the end with stats

**Modified: `src/pages/Locations.tsx`**
- Add a "Canvas" button in the header bar (using a ClipboardList or Play icon)
- Links to `/canvas` via `useNavigate`

**Modified: `src/App.tsx`**
- Add route: `<Route path="/canvas" element={<CanvasPage />} />` inside the AppLayout group

### Technical Details

- No database changes needed -- canvas mode reads/updates existing `locations` table
- Uses existing RLS policies (surveyors and admins can update)
- Editable fields use existing Input, Select, and Badge components
- Navigation via keyboard shortcuts (left/right arrows) for power users
- The canvas respects the same filters (type, assignment) if passed as query params, otherwise reviews all locations
- Mobile-friendly single-card layout

