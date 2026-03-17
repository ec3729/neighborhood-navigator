

## Data Management Page

### Overview
Create a new admin-only "Data Management" page for importing and exporting location data as CSV files. Add it to the admin sidebar nav and routing.

### New file: `src/pages/DataManagementPage.tsx`
- Admin guard (redirect non-admins to dashboard)
- Two main sections in Cards: **Export** and **Import**

**Export Section:**
- "Export Locations" button that fetches all locations (with zone names) and downloads as CSV
- Columns: Name, Address, Location Type, Status, Category, Access Type, Zone, Latitude, Longitude, Surveyed At, Updated At
- Optional filters before export: Status, Type, Zone (reuse existing filter patterns)
- Uses `Blob` + `URL.createObjectURL` for client-side CSV download

**Import Section:**
- File input accepting `.csv` files
- Parse CSV client-side (simple comma-split with header row detection)
- Preview table showing first 5 rows before confirming import
- Expected CSV columns: `name`, `address`, `location_type`, `status`, `category`, `access_type`, `zone_name`, `latitude`, `longitude`
- On confirm: look up zone IDs by name, then batch insert into `locations` table with `created_by` set to current user
- Show success/error toast with count of imported rows
- Validation: require `address` column, validate enum values for `location_type` and `status`

### Navigation & Routing

**`src/components/AppSidebar.tsx`**: Add "Data" to `adminItems` with `Database` icon, linking to `/data`

**`src/App.tsx`**: Import `DataManagementPage`, add route `<Route path="/data" element={<DataManagementPage />} />` inside the AppLayout group

