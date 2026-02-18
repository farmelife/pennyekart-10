
-- Create app_settings table to store configurable key-value settings
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public config like URLs)
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only super admins or users with appropriate permissions can modify settings
CREATE POLICY "Authorized can insert app settings"
  ON public.app_settings FOR INSERT
  WITH CHECK (is_super_admin() OR has_permission('read_products'::text));

CREATE POLICY "Authorized can update app settings"
  ON public.app_settings FOR UPDATE
  USING (is_super_admin() OR has_permission('read_products'::text));

CREATE POLICY "Authorized can delete app settings"
  ON public.app_settings FOR DELETE
  USING (is_super_admin());

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Penny Carbs setting
INSERT INTO public.app_settings (key, value, description)
VALUES ('pennycarbs_url', '', 'External URL for Penny Carbs food delivery website (embedded via iframe)');
