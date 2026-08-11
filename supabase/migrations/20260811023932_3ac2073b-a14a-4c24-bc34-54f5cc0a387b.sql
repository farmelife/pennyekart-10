DROP FUNCTION IF EXISTS public.get_utility_providers();
CREATE FUNCTION public.get_utility_providers()
 RETURNS TABLE(provider_user_id uuid, display_name text, company_name text, mobile_number text, business_address text, local_body_name text, ward_number integer, avatar_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT
    p.user_id,
    COALESCE(NULLIF(p.company_name, ''), p.full_name) AS display_name,
    p.company_name,
    p.mobile_number,
    p.business_address,
    lb.name AS local_body_name,
    p.ward_number,
    p.avatar_url
  FROM public.profiles p
  JOIN public.utility_services us ON us.provider_user_id = p.user_id
  LEFT JOIN public.locations_local_bodies lb ON lb.id = p.local_body_id
  WHERE us.is_active = true AND us.is_approved = true;
$function$