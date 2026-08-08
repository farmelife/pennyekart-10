import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench, LogOut, Phone, Home } from "lucide-react";
import {
  PRICE_UNITS, REQUEST_STATUSES, formatServicePrice, statusLabel, unitsForCategoryType,
  type UtilityCategory, type UtilityService, type UtilityRequest,
} from "@/lib/utilityServices";

const emptyService = {
  name: "", description: "", image_url: "", category_id: "", price: 0, price_unit: "fixed",
  contact_phone: "", contact_whatsapp: "", coverage_area: "", is_active: true,
};

const UtilityPartnerDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<UtilityCategory[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [requests, setRequests] = useState<UtilityRequest[]>([]);
  const [form, setForm] = useState(emptyService);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const unitOptions = form.category_id ? unitsForCategoryType(selectedCategory?.category_type) : PRICE_UNITS;

  const fetchAll = async () => {
    if (!profile?.user_id) return;
    const [cats, svcs] = await Promise.all([
      supabase.from("utility_service_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("utility_services").select("*").eq("provider_user_id", profile.user_id).order("created_at", { ascending: false }),
    ]);
    setCategories((cats.data as UtilityCategory[]) ?? []);
    const list = (svcs.data as UtilityService[]) ?? [];
    setServices(list);
    if (list.length) {
      const { data } = await supabase
        .from("utility_service_requests").select("*")
        .in("service_id", list.map((s) => s.id))
        .order("created_at", { ascending: false });
      setRequests((data as UtilityRequest[]) ?? []);
    } else {
      setRequests([]);
    }
  };

  useEffect(() => { fetchAll(); }, [profile?.user_id]);

  const save = async () => {
    if (!profile?.user_id) return;
    if (!form.name.trim()) { toast({ title: "Service name is required", variant: "destructive" }); return; }
    const payload = {
      ...form,
      provider_user_id: profile.user_id,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      description: form.description || null,
      contact_phone: form.contact_phone || null,
      contact_whatsapp: form.contact_whatsapp || null,
      coverage_area: form.coverage_area || null,
    };
    const { error } = editId
      ? await supabase.from("utility_services").update(payload).eq("id", editId)
      : await supabase.from("utility_services").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Service updated" : "Service submitted for approval" });
    setOpen(false); setForm(emptyService); setEditId(null); fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("utility_services").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("utility_services").update({ is_active: value }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const setRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("utility_service_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request updated" }); fetchAll(); }
  };

  const openEdit = (s: UtilityService) => {
    setForm({
      name: s.name, description: s.description ?? "", image_url: s.image_url ?? "",
      category_id: s.category_id ?? "", price: Number(s.price ?? 0), price_unit: s.price_unit ?? "fixed",
      contact_phone: s.contact_phone ?? "", contact_whatsapp: s.contact_whatsapp ?? "",
      coverage_area: s.coverage_area ?? "", is_active: s.is_active,
    });
    setEditId(s.id); setOpen(true);
  };

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "—";
  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-primary">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary-foreground" />
            <h1 className="text-base font-bold text-primary-foreground sm:text-lg">Utility Partner Dashboard</h1>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container space-y-4 py-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">My Services</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{services.length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{services.filter((s) => s.is_approved).length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending Requests</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{pending}</CardContent></Card>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">My Services</TabsTrigger>
            <TabsTrigger value="requests">Requests <Badge variant="outline" className="ml-2">{requests.length}</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyService); setEditId(null); } }}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Service</Button></DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editId ? "Edit Service" : "New Service"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Service Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category_id || "none"} onValueChange={(v) => {
                        const id = v === "none" ? "" : v;
                        const nextUnits = id ? unitsForCategoryType(categories.find((c) => c.id === id)?.category_type) : PRICE_UNITS;
                        const keep = nextUnits.some((u) => u.value === form.price_unit);
                        setForm({ ...form, category_id: id, price_unit: keep ? form.price_unit : nextUnits[0].value });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Price (₹)</Label><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                      <div>
                        <Label>Price Type</Label>
                        <Select value={form.price_unit} onValueChange={(v) => setForm({ ...form, price_unit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{unitOptions.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                      <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} /></div>
                    </div>
                    <div><Label>Coverage Area</Label><Input value={form.coverage_area} onChange={(e) => setForm({ ...form, coverage_area: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                    <p className="text-xs text-muted-foreground">New services stay hidden until an admin approves them.</p>
                    <Button className="w-full" onClick={save}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {services.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No services added yet</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex gap-3 p-4">
                      {s.image_url && <img src={s.image_url} alt={s.name} className="h-16 w-16 rounded-lg object-cover" loading="lazy" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{s.name}</h3>
                          <Badge variant={s.is_approved ? "default" : "outline"}>{s.is_approved ? "Approved" : "Pending"}</Badge>
                        </div>
                        <p className="text-sm text-primary">{formatServicePrice(Number(s.price), s.price_unit)}</p>
                        {s.description && <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                        <div className="mt-2 flex items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s.id, v)} />
                          <span className="text-xs text-muted-foreground">Active</span>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {requests.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No customer requests yet</CardContent></Card>
            ) : requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.contact_name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{r.contact_phone}</p>
                      <p className="text-xs text-muted-foreground">{serviceName(r.service_id)}</p>
                    </div>
                    <Badge variant="outline">{statusLabel(r.status)}</Badge>
                  </div>
                  {r.address && <p className="text-sm">{r.address}</p>}
                  {r.preferred_date && <p className="text-xs text-muted-foreground">Preferred: {r.preferred_date}</p>}
                  {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                  <Select value={r.status} onValueChange={(v) => setRequestStatus(r.id, v)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUEST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UtilityPartnerDashboard;