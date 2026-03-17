

## Add Status Filter to Canvas Start Page

### Overview
Add a toggle/filter on the Canvas Start Page so users can choose to only canvas locations with a specific status (e.g., "Not Surveyed"). The selected status is passed as a `status` query param to the review page, where it filters the query.

### Changes

**`src/pages/CanvasStartPage.tsx`**
- Add a status filter section below the zone picker with options: "All Statuses", "Not Surveyed", "In Progress", "Surveyed"
- Use a simple toggle group or radio-style card set
- Store selection in state (default: "all")
- Pass `?status={value}` alongside the zone param when navigating to `/canvas/review`
- Update location count badges to reflect the combined zone + status filter (fetch locations with both zone_id and status to compute accurate counts)

**`src/pages/CanvasPage.tsx`**
- Read the new `status` search param
- If present and not "all", add `.eq("status", statusParam)` to the query
- No other changes needed

