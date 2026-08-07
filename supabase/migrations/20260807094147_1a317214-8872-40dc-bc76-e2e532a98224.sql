-- profiles: seller type
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_type text;

-- Categories
CREATE TABLE public.utility_service_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.utility_service_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_service_categories TO authenticated;
GRANT ALL ON public.utility_service_categories TO service_role;

ALTER TABLE public.utility_service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active utility categories"
ON public.utility_service_categories FOR SELECT
USING (is_active = true OR public.is_super_admin() OR public.has_permission('view_services'));

CREATE POLICY "Admins can insert utility categories"
ON public.utility_service_categories FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR public.has_permission('create_services'));

CREATE POLICY "Admins can update utility categories"
ON public.utility_service_categories FOR UPDATE TO authenticated
USING (public.is_super_admin() OR public.has_permission('update_services'));

CREATE POLICY "Admins can delete utility categories"
ON public.utility_service_categories FOR DELETE TO authenticated
USING (public.is_super_admin() OR public.has_permission('delete_services'));

CREATE TRIGGER update_utility_service_categories_updated_at
BEFORE UPDATE ON public.utility_service_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services
CREATE TABLE public.utility_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id uuid,
  category_id uuid REFERENCES public.utility_service_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  image_url text,
  price numeric NOT NULL DEFAULT 0,
  price_unit text NOT NULL DEFAULT 'fixed',
  contact_phone text,
  contact_whatsapp text,
  coverage_area text,
  local_body_id uuid REFERENCES public.locations_local_bodies(id) ON DELETE SET NULL,
  ward_number integer,
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_utility_services_provider ON public.utility_services(provider_user_id);
CREATE INDEX idx_utility_services_category ON public.utility_services(category_id);

GRANT SELECT ON public.utility_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_services TO authenticated;
GRANT ALL ON public.utility_services TO service_role;

ALTER TABLE public.utility_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved utility services"
ON public.utility_services FOR SELECT
USING (
  (is_active = true AND is_approved = true)
  OR provider_user_id = auth.uid()
  OR public.is_super_admin()
  OR public.has_permission('view_services')
);

CREATE POLICY "Providers and admins can insert utility services"
ON public.utility_services FOR INSERT TO authenticated
WITH CHECK (
  provider_user_id = auth.uid()
  OR public.is_super_admin()
  OR public.has_permission('create_services')
);

CREATE POLICY "Providers and admins can update utility services"
ON public.utility_services FOR UPDATE TO authenticated
USING (
  provider_user_id = auth.uid()
  OR public.is_super_admin()
  OR public.has_permission('update_services')
);

CREATE POLICY "Providers and admins can delete utility services"
ON public.utility_services FOR DELETE TO authenticated
USING (
  provider_user_id = auth.uid()
  OR public.is_super_admin()
  OR public.has_permission('delete_services')
);

CREATE TRIGGER update_utility_services_updated_at
BEFORE UPDATE ON public.utility_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Booking requests
CREATE TABLE public.utility_service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.utility_services(id) ON DELETE CASCADE,
  customer_user_id uuid,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  address text,
  preferred_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  quoted_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_utility_requests_service ON public.utility_service_requests(service_id);
CREATE INDEX idx_utility_requests_customer ON public.utility_service_requests(customer_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_service_requests TO authenticated;
GRANT ALL ON public.utility_service_requests TO service_role;

ALTER TABLE public.utility_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers providers and admins can view requests"
ON public.utility_service_requests FOR SELECT TO authenticated
USING (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.utility_services s
    WHERE s.id = service_id AND s.provider_user_id = auth.uid()
  )
  OR public.is_super_admin()
  OR public.has_permission('view_services')
);

CREATE POLICY "Customers can create requests"
ON public.utility_service_requests FOR INSERT TO authenticated
WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Providers and admins can update requests"
ON public.utility_service_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.utility_services s
    WHERE s.id = service_id AND s.provider_user_id = auth.uid()
  )
  OR public.is_super_admin()
  OR public.has_permission('update_services')
);

CREATE POLICY "Admins can delete requests"
ON public.utility_service_requests FOR DELETE TO authenticated
USING (public.is_super_admin() OR public.has_permission('delete_services'));

CREATE TRIGGER update_utility_service_requests_updated_at
BEFORE UPDATE ON public.utility_service_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();