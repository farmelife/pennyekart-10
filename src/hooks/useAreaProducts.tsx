import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AreaProduct {
  id: string;
  name: string;
  price: number;
  mrp: number;
  discount_rate: number;
  image_url: string | null;
  description: string | null;
  category: string | null;
  section: string | null;
  stock: number;
}

export const useAreaProducts = () => {
  const { profile } = useAuth();
  const [products, setProducts] = useState<AreaProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!profile?.local_body_id || !profile?.ward_number) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get micro godown IDs (matching panchayath + ward)
      const { data: microWards } = await supabase
        .from("godown_wards")
        .select("godown_id, godowns!inner(godown_type)")
        .eq("local_body_id", profile.local_body_id)
        .eq("ward_number", profile.ward_number)
        .eq("godowns.godown_type", "micro");

      // Get area godown IDs (matching panchayath only, exclude local godowns)
      const { data: areaLocalBodies } = await supabase
        .from("godown_local_bodies")
        .select("godown_id, godowns!inner(godown_type)")
        .eq("local_body_id", profile.local_body_id)
        .eq("godowns.godown_type", "area");

      const godownIds = new Set<string>();
      microWards?.forEach(r => godownIds.add(r.godown_id));
      areaLocalBodies?.forEach(r => godownIds.add(r.godown_id));

      if (godownIds.size === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get product IDs from godown_stock for these godowns
      const { data: stockData } = await supabase
        .from("godown_stock")
        .select("product_id, quantity")
        .in("godown_id", Array.from(godownIds))
        .gt("quantity", 0);

      let allProducts: AreaProduct[] = [];

      if (stockData?.length) {
        const productIds = [...new Set(stockData.map(s => s.product_id))];
        const { data: productData } = await supabase
          .from("products")
          .select("id, name, price, mrp, discount_rate, image_url, description, category, section, stock")
          .in("id", productIds)
          .eq("is_active", true);
        if (productData) allProducts.push(...(productData as AreaProduct[]));
      }

      // Also fetch approved seller products assigned to these godowns
      const { data: sellerProducts } = await supabase
        .from("seller_products")
        .select("id, name, price, mrp, discount_rate, image_url, description, category, stock")
        .in("area_godown_id", Array.from(godownIds))
        .eq("is_active", true)
        .eq("is_approved", true)
        .gt("stock", 0);

      if (sellerProducts) {
        allProducts.push(
          ...sellerProducts.map(sp => ({
            ...sp,
            section: "seller" as string | null,
          } as AreaProduct))
        );
      }

      setProducts(allProducts);
      setLoading(false);
    };

    fetchProducts();
  }, [profile?.local_body_id, profile?.ward_number]);

  return { products, loading };
};
