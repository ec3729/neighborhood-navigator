
CREATE TABLE public.airtable_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id text NOT NULL,
  table_id text NOT NULL,
  field_mapping jsonb NOT NULL DEFAULT '{}',
  sync_enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.airtable_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage airtable_config"
ON public.airtable_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_airtable_config_updated_at
  BEFORE UPDATE ON public.airtable_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
