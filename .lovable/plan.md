

## Add Remove Assignee Button on Location Details

### Overview
Add an X button next to each assigned surveyor name on the Location Details page, visible only to admins. Clicking it removes that assignment from the `location_assignments` table.

### Changes

**`src/pages/LocationDetailsPage.tsx`**
- Replace the comma-separated assignee text (lines 345-350) with a flex-wrapped list of Badge/chip elements, each showing the surveyor name and an X button
- X button visible only when `canEdit` is true (admin or surveyor role)
- On click: delete from `location_assignments` where `location_id` and `user_id` match, then update local `assignedSurveyors` state
- Add a `handleRemoveAssignee` async function that calls `supabase.from("location_assignments").delete().eq("location_id", id).eq("user_id", userId)` and shows a toast on success/error

No database changes needed — the DELETE RLS policy for admins already exists.

