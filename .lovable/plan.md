

## Map View — Multi-Layer Interactive Map

Build out the `/map` page with Leaflet, combining all four approaches into a single cohesive map with toggleable layers.

### Layout: Side-by-Side List + Map

- Left panel (~300px, collapsible on mobile): scrollable location list grouped by street, showing name/address, status badge, and category
- Right panel: full-height Leaflet map
- Clicking a list item pans to the pin and opens its popup; clicking a pin highlights it in the list

### Map Layers (toggle via layer control)

**1. Status Pins (default layer)**
- Each location gets a circle marker color-coded by status: gray = not surveyed, amber = in progress, green = surveyed
- Popup shows name, address, category, status, and a link to `/locations/:id`
- At low zoom, markers cluster using `react-leaflet-markercluster` with cluster color based on completion percentage

**2. Canvass Path**
- Polyline connecting locations in street-groups sort order (reuse `sortLocationsByStreetGroups`)
- Numbered markers at each stop showing the canvass sequence
- Dashed line style to distinguish from roads

**3. Zone Overlays**
- If zones have associated locations with coordinates, draw a convex hull or bounding box per zone
- Color-fill with low opacity, labeled with zone name and completion stats (e.g., "Zone A — 4/7 surveyed")

### Filter Controls (top bar)
- Filter by zone, status, and category (mirroring canvass start page filters)
- Toggle layers on/off via Leaflet's built-in layer control

### Technical Details

**New dependencies**: `leaflet`, `react-leaflet`, `react-leaflet-markercluster`, `@types/leaflet`

**Files to create/modify**:
- `src/pages/MapView.tsx` — replace placeholder with full implementation
- `src/components/map/MapSidebar.tsx` — location list panel
- `src/components/map/StatusMarker.tsx` — color-coded circle marker component
- `src/components/map/CanvassPathLayer.tsx` — polyline + numbered stops
- `src/components/map/ZoneOverlay.tsx` — zone boundary polygons

**Data**: Single query to `locations` table (with zone join) — all 10 locations with lat/lng. Map centers on the bounding box midpoint (~40.716, -73.998) at zoom ~16.

**No database changes needed.** All data (coordinates, status, zone, category) already exists.

