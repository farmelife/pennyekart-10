ALTER TABLE public.utility_service_categories
ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'service';