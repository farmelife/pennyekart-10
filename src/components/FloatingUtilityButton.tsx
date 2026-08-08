import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


const FloatingUtilityButton = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("utility_service_categories")
        .select("name, image_url")
        .eq("is_active", true)
        .order("sort_order");
      setImages(
        (data ?? [])
          .filter((c: any) => c.image_url)
          .map((c: any) => ({ url: c.image_url as string, name: c.name as string }))
      );
    };
    load();
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 2500);
    return () => clearInterval(t);
  }, [images.length]);

  const current = images[idx];

  return (
    <button
      onClick={() => navigate("/utility-services")}
      aria-label="Open utility services"
      className="fixed bottom-40 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-card shadow-lg transition-transform hover:scale-110 md:bottom-24"
    >
      {current ? (
        <img
          key={current.url}
          src={current.url}
          alt={current.name}
          className="h-full w-full animate-fade-in object-cover"
          loading="lazy"
        />
      ) : (
        <Wrench className="h-6 w-6 text-primary" />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-primary/80 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-primary-foreground">
        Utility
      </span>
    </button>
  );
};

export default FloatingUtilityButton;
