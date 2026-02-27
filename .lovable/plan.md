

## CSV Upload for Bulk Location Import (Admin Only)

### Overview
Add a CSV upload button to the Locations page that allows admins to bulk-import addresses. The CSV is parsed client-side, validated, and inserted into the `locations` table.

### Expected CSV Format
- A simple CSV with at minimum an `address` column
- Optional columns: `location_type` (residential, business, vacant, public_space)
- If `location_type` is missing or invalid, default to `residential`

### UI Changes (Locations.tsx)
- Add an "Upload CSV" button next to the existing "Add Location" button, visible only to admins
- Clicking opens a dialog with:
  - A file input accepting `.csv` files
  - A preview table showing parsed rows (address + type) before import
  - Error summary for any invalid rows (e.g., missing address)
  - An "Import X Locations" confirmation button
- After import, show a toast with success/failure count and refresh the list

### Implementation Details

**1. CSV Parsing (client-side)**
- Read the file using `FileReader`
- Split by newlines, parse headers, extract `address` and optional `location_type` columns
- Validate: skip rows with empty addresses, normalize type values
- No external library needed -- simple CSV parsing is sufficient for this use case

**2. Bulk Insert**
- Use `supabase.from("locations").insert(rows)` with `created_by` set to the current user ID
- The existing RLS policy already allows admins to insert (via the `has_role` check)
- Batch in groups of 100 to avoid payload limits

**3. File: `src/pages/Locations.tsx`**
- Add `Upload` icon import from lucide-react
- Add state for CSV dialog, parsed rows, errors, and uploading status
- Add a new Dialog component for the CSV upload flow
- Add `handleCSVUpload` function for file reading and parsing
- Add `handleBulkImport` function for inserting rows

### Technical Details

No database changes are needed -- the existing `locations` table and RLS policies support this feature. The insert policy allows admins and surveyors to create locations, so admin CSV uploads will work with current permissions.

