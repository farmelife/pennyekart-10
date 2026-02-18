-- Fix deduct_stock_on_delivery trigger to deduct seller_products stock
-- by scanning items JSONB for seller product IDs (not relying on seller_product_id column which may be null)
CREATE OR REPLACE FUNCTION public.deduct_stock_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _item jsonb;
  _product_id uuid;
  _qty int;
  _godown_id uuid;
  _customer_lb_id uuid;
  _customer_ward int;
  _stock_row record;
BEGIN
  -- Only fire when status changes TO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    
    -- Determine godown: use order's godown_id if set, otherwise find micro godown from customer location
    _godown_id := NEW.godown_id;
    
    IF _godown_id IS NULL AND NEW.user_id IS NOT NULL THEN
      SELECT local_body_id, ward_number INTO _customer_lb_id, _customer_ward
      FROM public.profiles WHERE user_id = NEW.user_id;
      
      IF _customer_lb_id IS NOT NULL AND _customer_ward IS NOT NULL THEN
        SELECT gw.godown_id INTO _godown_id
        FROM public.godown_wards gw
        JOIN public.godowns g ON g.id = gw.godown_id
        WHERE gw.local_body_id = _customer_lb_id
          AND gw.ward_number = _customer_ward
          AND g.godown_type = 'micro'
        LIMIT 1;
      END IF;
    END IF;
    
    -- Loop through order items
    FOR _item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      _product_id := (_item->>'id')::uuid;
      _qty := COALESCE((_item->>'quantity')::int, 1);
      
      -- Check if this item is a seller product and deduct from seller_products.stock
      IF EXISTS (SELECT 1 FROM public.seller_products WHERE id = _product_id) THEN
        UPDATE public.seller_products 
        SET stock = GREATEST(0, stock - _qty) 
        WHERE id = _product_id;
      
      -- Otherwise deduct from godown_stock (regular product)
      ELSIF _godown_id IS NOT NULL THEN
        FOR _stock_row IN 
          SELECT id, quantity FROM public.godown_stock 
          WHERE godown_id = _godown_id AND product_id = _product_id AND quantity > 0
          ORDER BY created_at ASC
        LOOP
          IF _qty <= 0 THEN EXIT; END IF;
          
          IF _stock_row.quantity >= _qty THEN
            UPDATE public.godown_stock SET quantity = quantity - _qty WHERE id = _stock_row.id;
            _qty := 0;
          ELSE
            _qty := _qty - _stock_row.quantity;
            UPDATE public.godown_stock SET quantity = 0 WHERE id = _stock_row.id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    -- Also update the order's godown_id if it wasn't set
    IF NEW.godown_id IS NULL AND _godown_id IS NOT NULL THEN
      NEW.godown_id := _godown_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;