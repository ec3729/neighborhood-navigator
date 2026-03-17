

## Admin Review Page

### Overview
Create a new admin-only "Review" page that displays all locations in a table with comprehensive filtering and sorting, including a date range picker to filter by `updated_at`. Add it to the admin sidebar nav and routing.

### Changes

**New file: `src/pages/ReviewPage.tsx`**
- Admin-only page (redirect non-admins to dashboard)
- Fetch all locations with zone names and surveyor profiles
- Table columns: Name, Address, Type, Status, Zone, Updated At, Surveyed At
- Clickable rows to navigate to location details
- Filters:
  - Text search (name/address)
  - Status dropdown (All / Not Surveyed / In Progress / Surveyed)
  - Type dropdown (All / Residential / Business / Vacant / Public Space)
  - Zone dropdown
  - Date range picker for `updated_at` (using Popover + Calendar with "from" and "to" dates)
- Sorting: clickable column headers with asc/desc toggle (reuse the ArrowUpDown pattern from Locations page)
- Pagination (25 per page, same pattern as Locations)

**`src/components/AppSidebar.tsx`**
- Add "Review" to the `adminItems` array with `Eye` or `FileSearch` icon, linking to `/review`

**`src/components/MobileNav.tsx`**
- No change needed (admin items aren't in mobile nav currently)

**`src/App.tsx`**
- Import `ReviewPage` and add route: `<Route path="/review" element={<ReviewPage />} />`  inside the `AppLayout` group

### Date Filter Implementation
- Two date states: `dateFrom` and `dateTo`
- Use the Shadcn Calendar in a Popover for each
- Filter logic: if `dateFrom` is set, only show locations where `updated_at >= dateFrom`; if `dateTo` is set, only show where `updated_at <= end of dateTo day`
- A "Clear dates" button to reset

