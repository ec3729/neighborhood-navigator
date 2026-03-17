
-- Create junction table for multiple assignments
CREATE TABLE public.location_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, user_id)
);

ALTER TABLE public.location_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can view assignments"
ON public.location_assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert assignments"
ON public.location_assignments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assignments"
ON public.location_assignments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing data
INSERT INTO public.location_assignments (location_id, user_id)
SELECT id, assigned_to FROM public.locations WHERE assigned_to IS NOT NULL;

-- Drop old column
ALTER TABLE public.locations DROP COLUMN assigned_to;
