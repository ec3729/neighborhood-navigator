

## Add `surveyed_at` Field to Locations

### Database Migration
Add a nullable `surveyed_at` timestamp column to the `locations` table:
```sql
ALTER TABLE public.locations ADD COLUMN surveyed_at timestamptz;
```

### Code Changes

**`src/pages/CanvasPage.tsx`** (or wherever survey completion updates location status to "surveyed")
- When setting `status = 'surveyed'`, also set `surveyed_at = new Date().toISOString()`

**`src/pages/LocationDetailsPage.tsx`**
- Display the `surveyed_at` date if present (e.g., "Surveyed on Mar 15, 2026")

Need to find exactly where location status gets updated to "surveyed" to add the timestamp write.

