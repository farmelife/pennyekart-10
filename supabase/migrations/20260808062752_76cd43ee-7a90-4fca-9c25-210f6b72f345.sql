CREATE TABLE public.utility_seller_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid NOT NULL,
  local_body_id uuid NOT NULL REFERENCES public.locations_local_bodies(id) ON DELETE CASCADE,
  ward_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX utility_seller_areas_unique
  ON public.utility_seller_areas (seller_user_id, local_body_id, COALESCE(ward_number, -1));

GRANT SELECT ON public.utility_seller_areas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_seller_areas TO authenticated;
GRANT ALL ON public.utility_seller_areas TO service_role;

ALTER TABLE public.utility_seller_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view utility seller areas"
  ON public.utility_seller_areas FOR SELECT USING (true);

CREATE POLICY "Managers can insert utility seller areas"
  ON public.utility_seller_areas FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.has_permission('update_services'));

CREATE POLICY "Managers can update utility seller areas"
  ON public.utility_seller_areas FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.has_permission('update_services'));

CREATE POLICY "Managers can delete utility seller areas"
  ON public.utility_seller_areas FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.has_permission('update_services'));

CREATE TRIGGER update_utility_seller_areas_updated_at
  BEFORE UPDATE ON public.utility_seller_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();