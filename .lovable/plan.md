

## Make Location Rows Clickable + Create Location Details Page

### Overview
Make each row in the Locations table clickable to navigate to a new Location Details page at `/locations/:id`. The details page will show all location info, its zone, assigned surveyor, survey status, and any associated surveys.

### Changes

**1. `src/pages/Locations.tsx`**
- Add `onClick={() => navigate(`/locations/${loc.id}`)}` and `className="cursor-pointer"` to each `TableRow`
- Ensure clicking the checkbox column doesn't trigger navigation (stop propagation on checkbox click)

**2. `src/pages/LocationDetailsPage.tsx` (new file)**
- Fetch location by ID from the `locations` table
- Display all fields: name, address, type, status, zone (with link to zone details), assigned surveyor, coordinates, created date
- Fetch associated surveys from the `surveys` table where `location_id` matches
- Show surveys in a simple list/table (surveyor, date, property condition, etc.)
- Back button to `/locations`
- Follow the same layout pattern as `ZoneDetailsPage` (Card-based, consistent header style)

**3. `src/App.tsx`**
- Import `LocationDetailsPage` and add route: `<Route path="/locations/:id" element={<LocationDetailsPage />} />`

### Technical Details
- The `surveys` table has `location_id` foreign key, so we can query related surveys
- Zone name resolved via a separate query or join
- Surveyor name resolved via profiles table lookup
- Reuse existing UI components (Card, Badge, Table, Button)

