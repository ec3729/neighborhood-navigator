

## Allow Multiple Users Assigned to a Location

### Overview
Replace the single `assigned_to` UUID column with a junction table `location_assignments` so multiple surveyors can be assigned to one location. Update all pages that read/write assignments.

### Database Changes

1. **Create `location_assignments` table**
```sql
CREATE TABLE public.location_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, user_id)
);
ALTER TABLE public.location_assignments ENABLE ROW LEVEL SECURITY;
```

2. **RLS policies** (mirror locations pattern):
   - SELECT: all authenticated users
   - INSERT: admins
   - DELETE: admins

3. **Migrate existing data** from `assigned_to`:
```sql
INSERT INTO public.location_assignments (location_id, user_id)
SELECT id, assigned_to FROM public.locations WHERE assigned_to IS NOT NULL;
```

4. **Drop the old column**:
```sql
ALTER TABLE public.locations DROP COLUMN assigned_to;
```

### Code Changes

**`src/pages/Locations.tsx`**
- Remove `assigned_to` from Location interface
- Fetch assignments from `location_assignments` and build a `Map<locationId, userId[]>`
- Update filtering: "unassigned" = no entries in map; surveyor filter = check if surveyor is in the array
- Update sorting by assigned names (join all names)
- Update `handleBulkAssign` to insert into `location_assignments` (delete old + insert new, or upsert)
- Update table cell to show comma-separated names or "Unassigned"
- Update bulk assign dialog to allow adding an assignee (not replacing)

**`src/pages/LocationDetailsPage.tsx`**
- Remove `assigned_to` from Location interface
- Fetch from `location_assignments` where `location_id = id`, join with profiles
- Display list of assigned surveyors instead of single name
- Add ability to add/remove assignees (for admins)

**`src/pages/CanvasPage.tsx`**
- Remove `assigned_to` from Location interface and query
- Fetch assignments separately or skip showing assignment on canvas cards

### Technical Details
- The junction table approach is standard for many-to-many relationships
- Existing assignment data is migrated automatically before dropping the column
- The `assigned_to` column is removed entirely to avoid confusion

