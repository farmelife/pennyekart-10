import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { MapPin, Phone, Search, Users } from "lucide-react";

interface SellerProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  company_name: string | null;
  is_approved: boolean;
  is_blocked: boolean;
  local_body_id: string | null;
  ward_number: number | null;
  created_at: string;
}

interface LocalBody {
  id: string;
  name: string;
  body_type: string;
  ward_count: number;
  district_id: string;
}

interface ServiceRow {
  id: string;
  name: string;
  provider_user_id: string | null;
  local_body_id: string | null;
  ward_number: number | null;
  is_active: boolean;
  is_approved: boolean;
}

const UtilitySellerRegistrations = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterBody, setFilterBody] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [target, setTarget] = useState<SellerProfile | null>(null);
  const [allocBody, setAllocBody] = useState("");
  const [allocWard, setAllocWard] = useState("");
  const [applyToServices, setApplyToServices] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [profs, lbs, dists, svcs] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, full_name, email, mobile_number, company_name, is_approved, is_blocked, local_body_id, ward_number, created_at")
        .eq("user_type", "selling_partner")
        .eq("seller_type", "utility")
        .order("created_at", { ascending: false }),
      supabase.from("locations_local_bodies").select("id, name, body_type, ward_count, district_id").order("name"),
      supabase.from("locations_districts").select("id, name"),
      supabase.from("utility_services").select("id, name, provider_user_id, local_body_id, ward_number, is_active, is_approved"),
    ]);
    setSellers((profs.data as SellerProfile[]) ?? []);
    setLocalBodies((lbs.data as LocalBody[]) ?? []);
    const dmap: Record<string, string> = {};
    (dists.data ?? []).forEach((d: any) => { dmap[d.id] = d.name; });
    setDistricts(dmap);
    setServices((svcs.data as ServiceRow[]) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const bodyLabel = (id: string | null) => {
    const lb = localBodies.find((l) => l.id === id);
    if (!lb) return "—";
    return `${lb.name} (${districts[lb.district_id] ?? "—"})`;
  };

  const servicesOf = (userId: string) => services.filter((s) => s.provider_user_id === userId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((s) => {
      if (q && ![s.full_name, s.mobile_number, s.email, s.company_name].some((v) => v?.toLowerCase().includes(q))) return false;
      if (filterBody !== "all" && s.local_body_id !== filterBody) return false;
      if (filterWard !== "all" && String(s.ward_number ?? "") !== filterWard) return false;
      if (filterStatus === "approved" && !s.is_approved) return false;
      if (filterStatus === "pending" && s.is_approved) return false;
      if (filterStatus === "blocked" && !s.is_blocked) return false;
      if (filterStatus === "unassigned" && s.local_body_id) return false;
      return true;
    });
  }, [sellers, search, filterBody, filterWard, filterStatus]);

  const filterWardOptions = useMemo(() => {
    const lb = localBodies.find((l) => l.id === filterBody);
    const count = lb?.ward_count ?? 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [filterBody, localBodies]);

  const allocWardOptions = useMemo(() => {
    const lb = localBodies.find((l) => l.id === allocBody);
    const count = lb?.ward_count ?? 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [allocBody, localBodies]);

  const openAllocate = (s: SellerProfile) => {
    setTarget(s);
    setAllocBody(s.local_body_id ?? "");
    setAllocWard(s.ward_number ? String(s.ward_number) : "");
    setApplyToServices(true);
  };

  const saveAllocation = async () => {
    if (!target) return;
    if (!allocBody) { toast({ title: "Select a local body", variant: "destructive" }); return; }
    setSaving(true);
    const ward = allocWard ? Number(allocWard) : null;
    const { error } = await supabase
      .from("profiles")
      .update({ local_body_id: allocBody, ward_number: ward })
      .eq("id", target.id);
    if (error) {
      setSaving(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (applyToServices) {
      const { error: svcErr } = await supabase
        .from("utility_services")
        .update({ local_body_id: allocBody, ward_number: ward })
        .eq("provider_user_id", target.user_id);
      if (svcErr) {
        setSaving(false);
        toast({ title: "Services not updated", description: svcErr.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    setTarget(null);
    toast({ title: "Location reallocated" });
    fetchAll();
  };

  const toggleField = async (s: SellerProfile, field: "is_approved" | "is_blocked", value: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", s.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const canEdit = hasPermission("update_services");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, mobile, company" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterBody} onValueChange={(v) => { setFilterBody(v); setFilterWard("all"); }}>
          <SelectTrigger className="w-[210px]"><SelectValue placeholder="Local body" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All local bodies</SelectItem>
            {localBodies.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterWard} onValueChange={setFilterWard} disabled={filterBody === "all"}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Ward" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All wards</SelectItem>
            {filterWardOptions.map((w) => <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending">Pending approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="unassigned">No location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="admin-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seller</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location / Ward</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const svcs = servicesOf(s.user_id);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.full_name || "Unnamed"}
                    {s.company_name && <div className="text-xs text-muted-foreground">{s.company_name}</div>}
                    <div className="text-xs text-muted-foreground">Joined {new Date(s.created_at).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.mobile_number && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.mobile_number}</div>}
                    {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{bodyLabel(s.local_body_id)}</div>
                    <div className="text-xs text-muted-foreground">{s.ward_number ? `Ward ${s.ward_number}` : "No ward"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{svcs.length}</Badge>
                    {svcs.length > 0 && (
                      <div className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">
                        {svcs.map((v) => v.name).join(", ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Switch checked={s.is_approved} disabled={!canEdit} onCheckedChange={(v) => toggleField(s, "is_approved", v)} /></TableCell>
                  <TableCell><Switch checked={s.is_blocked} disabled={!canEdit} onCheckedChange={(v) => toggleField(s, "is_blocked", v)} /></TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => openAllocate(s)}>
                      <MapPin className="mr-1 h-3.5 w-3.5" /> Reallocate
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-5 w-5" /> No utility seller registrations found
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target} onOpenChange={(v) => { if (!v) setTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reallocate location — {target?.full_name || "Seller"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Local body</Label>
              <Select value={allocBody} onValueChange={(v) => { setAllocBody(v); setAllocWard(""); }}>
                <SelectTrigger><SelectValue placeholder="Select local body" /></SelectTrigger>
                <SelectContent>
                  {localBodies.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} — {districts[l.district_id] ?? ""} ({l.body_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ward</Label>
              <Select value={allocWard} onValueChange={setAllocWard} disabled={!allocBody}>
                <SelectTrigger><SelectValue placeholder={allocBody ? "Select ward" : "Select local body first"} /></SelectTrigger>
                <SelectContent>
                  {allocWardOptions.map((w) => <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={applyToServices} onCheckedChange={setApplyToServices} />
              <Label>Also apply to this seller's services ({target ? servicesOf(target.user_id).length : 0})</Label>
            </div>
            <Button className="w-full" onClick={saveAllocation} disabled={saving}>
              {saving ? "Saving..." : "Save allocation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilitySellerRegistrations;
