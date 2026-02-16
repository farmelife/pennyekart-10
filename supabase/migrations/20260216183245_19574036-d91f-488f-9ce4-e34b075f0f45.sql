
-- Fix existing completed transfers that never created godown_stock entries
INSERT INTO public.godown_stock (godown_id, product_id, quantity, purchase_price)
SELECT st.to_godown_id, st.product_id, SUM(st.quantity), 0
FROM public.stock_transfers st
WHERE st.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM public.godown_stock gs 
  WHERE gs.godown_id = st.to_godown_id AND gs.product_id = st.product_id
)
GROUP BY st.to_godown_id, st.product_id;
