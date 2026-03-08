

## Add Zones to Group Locations

### Overview
Add a `zones` table and a `zone_id` foreign key on `locations` so locations can be grouped into zones. Update the Locations page and Canvas page to display and manage zone assignments.

### 1. Database Migration

Create a `zones` table and add `zone_id` to `locations`:

```sql
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- RLS: same pattern as locations
CREATE POLICY "Authenticated can view zones" ON zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage zones" ON zones FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update zones" ON zones FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete zones" ON zones FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add zone_id to locations
ALTER TABLE locations ADD COLUMN zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;
```

### 2. Locations Page Updates (`src/pages/Locations.tsx`)

- Fetch zones and build a lookup map
- Add a **Zone filter** dropdown alongside existing type/assignment filters
- Display a **Zone** column in the table
- Add a **zone selector** in the Add Location dialog
- Add **bulk assign to zone** in the bulk actions bar (similar to bulk assign surveyor)
- Show zone name as a badge or text in each row

### 3. Canvas Page Updates (`src/pages/CanvasPage.tsx`)

- Fetch zones for the dropdown
- Add a **Zone** select field on the review card (editable)
- Include zone in the save/update logic
- Support `zone` URL param for filtering canvas to a specific zone

### 4. Zone Management

- Add a small zone management section: a dialog to create/edit/delete zones (admin only), accessible from the Locations page header or a dedicated area

