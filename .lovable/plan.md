

## Filter Unassigned Locations on Zone Details Page

### Change

In `src/pages/ZoneDetailsPage.tsx`, add a toggle/checkbox in the "Add locations to zone" card that filters the unassigned list to show only locations where `zone_id` is null (excluding those already in another zone).

### Implementation

- Add a `showUnzonedOnly` boolean state (default `true`)
- Add a `Switch` or `Checkbox` labeled "Show only unzoned locations" above or beside the search input
- Update `filteredUnassigned` to apply this filter:
  ```typescript
  const filteredUnassigned = unassignedLocations
    .filter((l) => !showUnzonedOnly || !l.zone_id)
    .filter((l) => l.address.toLowerCase().includes(q) || ...);
  ```
- The "Current Zone" column already shows "Other zone" badge for locations in a different zone, so the UX is consistent

Single file change: `src/pages/ZoneDetailsPage.tsx`

