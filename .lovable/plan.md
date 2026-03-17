

## Auto-Update Survey Status During Canvassing

### What Changes

**1. "Looks Good" (confirm) sets status to `in_progress`**
- When a canvasser clicks "Looks Good", if the location's current status is `not_surveyed`, automatically update it to `in_progress` in the database before advancing. This indicates the location has been reviewed.

**2. "Save & Next" sets status to `in_progress`**  
- When saving edits, force the status to `in_progress` (regardless of what the status dropdown shows), unless it's already `surveyed`. This ensures any edited location is marked as actively being worked on.

**3. Batch update to `surveyed` when session ends**
- When the "Review Complete" screen appears, collect all location IDs that were confirmed or updated (not skipped) during the session.
- Make a single batch update to set their status to `surveyed` and `surveyed_at` to the current timestamp.
- Show a toast confirming how many locations were marked as surveyed.

### Code Changes (single file)

**`src/pages/CanvassPage.tsx`**

- **`handleConfirm`**: Add a Supabase update call to set `status: 'in_progress'` if the location is currently `not_surveyed`. Update local state to reflect the change.

- **`handleSaveAndNext`**: Override `editStatus` to `in_progress` when saving (unless already `surveyed`). Remove the manual status-based `surveyed_at` logic since surveyed status is now set at session end.

- **`isDirty` check**: Exclude `editStatus` from the dirty check since status is now auto-managed (or keep it but auto-set status won't trigger "dirty" unnecessarily).

- **New `useEffect` on `finished`**: When `finished` becomes `true`, run a batch update for all confirmed/updated location IDs → set `status = 'surveyed'` and `surveyed_at = now()`. Update local state so the summary screen reflects final counts.

- **Status dropdown**: Either hide it from the canvass card (since it's auto-managed) or make it read-only to show the current state.

### No database changes needed
The existing `status` column and RLS policies already support these updates.

