
CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view zones" ON zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage zones" ON zones FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update zones" ON zones FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete zones" ON zones FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

ALTER TABLE locations ADD COLUMN zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;
