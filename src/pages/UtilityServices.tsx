import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Wrench, MapPin, Phone, Search } from "lucide-react";
import { formatServicePrice, type UtilityCategory, type UtilityService } from "@/lib/utilityServices";

const UtilityServices = () => {
  const [categories, setCategories] = useState<UtilityCategory[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<UtilityService | null>(null);
  const [form, setForm] = useState({ contact_name: "", contact_phone: "", address: "", preferred_date: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const [cats, svcs] = await Promise.all([
        supabase.from("utility_service_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("utility_services").select("*").eq("is_active", true).eq("is_approved", true).order("sort_order"),
      ]);
      setCategories((cats.data as UtilityCategory[]) ?? []);
      setServices((svcs.data as UtilityService[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const visible = useMemo(() => {
    let list = activeCat === "all" ? services : services.filter((s) => s.category_id === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [services, activeCat, query]);

  const openBooking = (s: UtilityService) => {
    if (!user) {
      toast({ title: "Please log in", description: "Log in to request a service." });
      navigate("/customer/login");
      return;
    }
    setForm({
      contact_name: profile?.full_name ?? "",
      contact_phone: (profile as any)?.mobile_number ?? "",
      address: (profile as any)?.business_address ?? "",
      preferred_date: "",
      notes: "",
    });
    setBooking(s);
  };

  const submitRequest = async () => {
    if (!booking || !user) return;
    if (!form.contact_name.trim() || !/^\d{10}$/.test(form.contact_phone)) {
      toast({ title: "Enter your name and a valid 10-digit phone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("utility_service_requests").insert({
      service_id: booking.id,
      customer_user_id: user.id,
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone,
      address: form.address || null,
      preferred_date: form.preferred_date || null,
      notes: form.notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request sent!", description: "The service provider will contact you shortly." });
      setBooking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b bg-primary">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">Utility Services</h1>
          </div>
        </div>
      </header>

      <main className="container py-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search utility services..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {categories.length > 0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
            <Button variant={activeCat === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveCat("all")}>All</Button>
            {categories.map((c) => (
              <Button key={c.id} variant={activeCat === c.id ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => setActiveCat(c.id)}>
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-center text-muted-foreground">Loading services...</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Wrench className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No utility services yet</p>
            <p className="text-sm text-muted-foreground">We're onboarding outside service partners. Stay tuned.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => (
              <Card key={s.id} className="overflow-hidden transition-shadow hover:shadow-md">
                {s.image_url && <img src={s.image_url} alt={s.name} className="h-36 w-full object-cover" loading="lazy" />}
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{s.name}</h2>
                    <Badge variant="secondary">{formatServicePrice(Number(s.price), s.price_unit)}</Badge>
                  </div>
                  {s.description && <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
                  {s.coverage_area && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{s.coverage_area}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => openBooking(s)}>Request Service</Button>
                    {s.contact_phone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${s.contact_phone}`} aria-label={`Call ${s.name}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!booking} onOpenChange={(v) => !v && setBooking(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Request: {booking?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Your Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit number" /></div>
            <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Preferred Date</Label><Input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Describe the work needed" /></div>
            <Button className="w-full" onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilityServices;