

## Add "Select All" Checkboxes to Zone Details Page

### Changes in `src/pages/ZoneDetailsPage.tsx`

**Assigned locations table** — Add a checkbox in the header that toggles all assigned locations:
- Checked state: `selectedToRemove.size === assignedLocations.length && assignedLocations.length > 0`
- Indeterminate: `selectedToRemove.size > 0 && selectedToRemove.size < assignedLocations.length`
- On change: select all or clear all

**Unassigned locations table** — Add a checkbox in the header that toggles all *visible/filtered* unassigned locations (capped at 100):
- Checked state: all visible rows are in `selectedToAdd`
- Indeterminate: some but not all visible rows selected
- On change: select all visible or clear all

Both use the existing `Checkbox` component which supports the `indeterminate` attribute via data state.

Single file change: `src/pages/ZoneDetailsPage.tsx`

