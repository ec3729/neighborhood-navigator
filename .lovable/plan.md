

## Add "Name" Field to Locations

### 1. Database Migration
Add a nullable `name` column (text) to the `locations` table:
```sql
ALTER TABLE public.locations ADD COLUMN name text;
```

### 2. Update Location Interface and State
- Add `name` to the `Location` interface in `Locations.tsx`
- Add `newName` state for the "Add Location" form

### 3. Update "Add Location" Dialog
- Add a "Name" input field (optional) above the address field
- Include `name` in the insert call

### 4. Update CSV Import
- Support an optional `name` column in CSV uploads
- Add `name` to `ParsedRow` interface and bulk insert logic

### 5. Update Table Display
- Add a "Name" column to the table (before Address)
- Make it sortable (add `"name"` to `SortField` type and sorting logic)
- Include name in the search filter so users can search by name or address
- Update `colCount` accordingly

### 6. Update Existing Test Data
- Update the 10 Chinatown business locations with appropriate business names (e.g., "Nom Wah Tea Parlor", "Wo Hop Restaurant", etc.)

### Technical Notes
- The `name` column is nullable so existing locations without names still work
- The types file (`types.ts`) will auto-regenerate after the migration
- No RLS policy changes needed -- existing policies cover the new column

