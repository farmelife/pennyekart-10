-- Fix existing seller product with null area_godown_id by assigning based on seller's godown assignment
UPDATE public.seller_products sp
SET area_godown_id = (
  SELECT sga.godown_id 
  FROM public.seller_godown_assignments sga 
  WHERE sga.seller_id = sp.seller_id 
  LIMIT 1
)
WHERE sp.area_godown_id IS NULL;