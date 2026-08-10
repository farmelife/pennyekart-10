CREATE TABLE public.utility_service_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.utility_services(id) ON DELETE CASCADE,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'nos',
  pack_size numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.utility_service_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_service_variants TO authenticated;
GRANT ALL ON public.utility_service_variants TO service_role;

ALTER TABLE public.utility_service_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variants of approved services"
ON public.utility_service_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.utility_services s
    WHERE s.id = utility_service_variants.service_id
      AND s.is_active = true AND s.is_approved = true
  )
);

CREATE POLICY "Providers can manage their own variants"
ON public.utility_service_variants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utility_services s
    WHERE s.id = utility_service_variants.service_id
      AND s.provider_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.utility_services s
    WHERE s.id = utility_service_variants.service_id
      AND s.provider_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all variants"
ON public.utility_service_variants FOR ALL
TO authenticated
USING (public.is_super_admin() OR public.has_permission('utility_services.manage'))
WITH CHECK (public.is_super_admin() OR public.has_permission('utility_services.manage'));

CREATE INDEX idx_utility_service_variants_service ON public.utility_service_variants(service_id);

CREATE TRIGGER update_utility_service_variants_updated_at
BEFORE UPDATE ON public.utility_service_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.utility_service_requests
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.utility_service_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS total_amount numeric;
