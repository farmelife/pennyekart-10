import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { ChevronDown, ChevronRight, MapPin, Phone, Search, Users } from "lucide-react";

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

interface SellerArea {
  id: string;
  seller_user_id: string;
  local_body_id: string;
  ward_number: number | null;
}

const UtilitySellerRegistrations = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [areas, setAreas] = useState<SellerArea[]>([]);
  const [search, setSearch] = useState("");
  const [filterBody, setFilterBody] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [target, setTarget] = useState<SellerProfile | null>(null);
  // local body id -> selected wards (empty array = all wards of that body)
  const [alloc, setAlloc] = useState<Record<string, number[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bodySearch, setBodySearch] = useState("");
  const [applyToServices, setApplyToServices] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [profs, lbs, dists, svcs, ars] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, full_name, email, mobile_number, company_name, is_approved, is_blocked, local_body_id, ward_number, created_at")
        .eq("user_type", "selling_partner")
        .eq("seller_type", "utility")
        .order("created_at", { ascending: false }),
      supabase.from("locations_local_bodies").select("id, name, body_type, ward_count, district_id").order("name"),
      supabase.from("locations_districts").select("id, name"),
      supabase.from("utility_services").select("id, name, provider_user_id, local_body_id, ward_number, is_active, is_approved"),
      supabase.from("utility_seller_areas").select("id, seller_user_id, local_body_id, ward_number"),
    ]);
    setSellers((profs.data as SellerProfile[]) ?? []);
    setLocalBodies((lbs.data as LocalBody[]) ?? []);
    const dmap: Record<string, string> = {};
    (dists.data ?? []).forEach((d: any) => { dmap[d.id] = d.name; });
    setDistricts(dmap);
    setServices((svcs.data as ServiceRow[]) ?? []);
    setAreas((ars.data as SellerArea[]) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const bodyName = (id: string | null) => localBodies.find((l) => l.id === id)?.name ?? "—";

  const areasOf = (userId: string) => areas.filter((a) => a.seller_user_id === userId);

  const servicesOf = (userId: string) => services.filter((s) => s.provider_user_id === userId);

  const areaSummary = (userId: string) => {
    const rows = areasOf(userId);
    if (rows.length === 0) return [] as string[];
    const grouped: Record<string, (number | null)[]> = {};
    rows.forEach((r) => {
      grouped[r.local_body_id] = [...(grouped[r.local_body_id] ?? []), r.ward_number];
    });
    return Object.entries(grouped).map(([lb, wards]) => {
      const nums = wards.filter((w): w is number => w != null).sort((a, b) => a - b);
      return `${bodyName(lb)}: ${nums.length ? `Ward ${nums.join(", ")}` : "All wards"}`;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((s) => {
      if (q && ![s.full_name, s.mobile_number, s.email, s.company_name].some((v) => v?.toLowerCase().includes(q))) return false;
      const rows = areas.filter((a) => a.seller_user_id === s.user_id);
      if (filterBody !== "all") {
        const match = s.local_body_id === filterBody || rows.some((a) => a.local_body_id === filterBody);
        if (!match) return false;
      }
      if (filterWard !== "all") {
        const w = Number(filterWard);
        const match =
          s.ward_number === w ||
          rows.some((a) => (filterBody === "all" || a.local_body_id === filterBody) && (a.ward_number === w || a.ward_number == null));
        if (!match) return false;
      }
      if (filterStatus === "approved" && !s.is_approved) return false;
      if (filterStatus === "pending" && s.is_approved) return false;
      if (filterStatus === "blocked" && !s.is_blocked) return false;
      if (filterStatus === "unassigned" && (s.local_body_id || rows.length > 0)) return false;
      return true;
    });
  }, [sellers, areas, search, filterBody, filterWard, filterStatus]);

  const filterWardOptions = useMemo(() => {
    const lb = localBodies.find((l) => l.id === filterBody);
    const count = lb?.ward_count ?? 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [filterBody, localBodies]);

  const dialogBodies = useMemo(() => {
    const q = bodySearch.trim().toLowerCase();
    if (!q) return localBodies;
    return localBodies.filter((l) => l.name.toLowerCase().includes(q) || (districts[l.district_id] ?? "").toLowerCase().includes(q));
  }, [localBodies, bodySearch, districts]);

  const openAllocate = (s: SellerProfile) => {
    const next: Record<string, number[]> = {};
    areasOf(s.user_id).forEach((a) => {
      next[a.local_body_id] = a.ward_number == null
        ? (next[a.local_body_id] ?? [])
        : [...(next[a.local_body_id] ?? []), a.ward_number];
    });
    if (Object.keys(next).length === 0 && s.local_body_id) {
      next[s.local_body_id] = s.ward_number ? [s.ward_number] : [];
    }
    setTarget(s);
    setAlloc(next);
    setExpanded(Object.keys(next)[0] ?? null);
    setBodySearch("");
    setApplyToServices(true);
  };

  const toggleBody = (id: string, checked: boolean) => {
    setAlloc((prev) => {
      const next = { ...prev };
      if (checked) { next[id] = prev[id] ?? []; } else { delete next[id]; }
      return next;
    });
    if (checked) setExpanded(id);
  };

  const toggleWard = (bodyId: string, ward: number, checked: boolean) => {
    setAlloc((prev) => {
      const cur = prev[bodyId] ?? [];
      const next = checked ? [...cur, ward] : cur.filter((w) => w !== ward);
      return { ...prev, [bodyId]: next };
    });
  };

  const setAllWards = (bodyId: string, all: boolean) => {
    const lb = localBodies.find((l) => l.id === bodyId);
    setAlloc((prev) => ({
      ...prev,
      [bodyId]: all ? [] : Array.from({ length: lb?.ward_count ?? 0 }, (_, i) => i + 1),
    }));
  };

  const saveAllocation = async () => {
    if (!target) return;
    const bodyIds = Object.keys(alloc);
    if (bodyIds.length === 0) { toast({ title: "Select at least one local body", variant: "destructive" }); return; }
    setSaving(true);

    const rows = bodyIds.flatMap((bodyId) => {
      const wards = alloc[bodyId];
      if (!wards || wards.length === 0) return [{ seller_user_id: target.user_id, local_body_id: bodyId, ward_number: null }];
      return wards.map((w) => ({ seller_user_id: target.user_id, local_body_id: bodyId, ward_number: w }));
    });

    const { error: delErr } = await supabase.from("utility_seller_areas").delete().eq("seller_user_id", target.user_id);
    if (delErr) {
      setSaving(false);
      toast({ title: "Error", description: delErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("utility_seller_areas").insert(rows);
    if (insErr) {
      setSaving(false);
      toast({ title: "Error", description: insErr.message, variant: "destructive" });
      return;
    }

    // keep the profile's primary location in sync with the first selected area
    const primary = rows[0];
    await supabase
      .from("profiles")
      .update({ local_body_id: primary.local_body_id, ward_number: primary.ward_number })
      .eq("id", target.id);

    if (applyToServices) {
      const { error: svcErr } = await supabase
        .from("utility_services")
        .update({ local_body_id: primary.local_body_id, ward_number: primary.ward_number })
        .eq("provider_user_id", target.user_id);
      if (svcErr) {
        setSaving(false);
        toast({ title: "Services not updated", description: svcErr.message, variant: "destructive" });
        return;
      }
    }

    setSaving(false);
    setTarget(null);
    toast({ title: "Areas allocated", description: `${rows.length} area(s) saved` });
    fetchAll();
  };

  const toggleField = async (s: SellerProfile, field: "is_approved" | "is_blocked", value: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", s.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const canEdit = hasPermission("update_services");
  const totalSelected = Object.entries(alloc).reduce((n, [, wards]) => n + (wards.length === 0 ? 1 : wards.length), 0);

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
              <TableHead>Allocated areas</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const svcs = servicesOf(s.user_id);
              const summary = areaSummary(s.user_id);
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
                    {summary.length === 0 ? (
                      <span className="text-muted-foreground">
                        {s.local_body_id ? `${bodyName(s.local_body_id)}${s.ward_number ? ` — Ward ${s.ward_number}` : ""}` : "No areas"}
                      </span>
                    ) : (
                      <div className="max-w-[260px] space-y-0.5">
                        {summary.slice(0, 3).map((t) => (
                          <div key={t} className="flex items-start gap-1 text-xs">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />{t}
                          </div>
                        ))}
                        {summary.length > 3 && (
                          <div className="text-xs text-muted-foreground">+{summary.length - 3} more</div>
                        )}
                      </div>
                    )}
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
                      <MapPin className="mr-1 h-3.5 w-3.5" /> Allocate
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Allocate areas — {target?.full_name || "Seller"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Search panchayath / municipality" value={bodySearch} onChange={(e) => setBodySearch(e.target.value)} />
            <div className="text-xs text-muted-foreground">
              Select multiple local bodies. Expand one to pick specific wards — leaving all wards unticked means the whole local body.
            </div>
            <ScrollArea className="h-[320px] rounded-md border">
              <div className="divide-y">
                {dialogBodies.map((l) => {
                  const selected = Object.prototype.hasOwnProperty.call(alloc, l.id);
                  const wards = alloc[l.id] ?? [];
                  const isOpen = expanded === l.id;
                  return (
                    <div key={l.id} className="p-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={selected} onCheckedChange={(v) => toggleBody(l.id, !!v)} />
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-1 text-left text-sm"
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                        >
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <span className="font-medium">{l.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {districts[l.district_id] ?? ""} · {l.body_type}
                          </span>
                        </button>
                        {selected && (
                          <Badge variant="secondary" className="text-[10px]">
                            {wards.length === 0 ? "All wards" : `${wards.length} ward(s)`}
                          </Badge>
                        )}
                      </div>
                      {isOpen && (
                        <div className="mt-2 pl-6">
                          <div className="mb-2 flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { toggleBody(l.id, true); setAllWards(l.id, true); }}>
                              Whole local body
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => { toggleBody(l.id, true); setAllWards(l.id, false); }}>
                              Select all wards
                            </Button>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {Array.from({ length: l.ward_count }, (_, i) => i + 1).map((w) => (
                              <label key={w} className="flex items-center gap-1 text-xs">
                                <Checkbox
                                  checked={wards.includes(w)}
                                  onCheckedChange={(v) => { toggleBody(l.id, true); toggleWard(l.id, w, !!v); }}
                                />
                                {w}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {dialogBodies.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">No local bodies found</div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Switch checked={applyToServices} onCheckedChange={setApplyToServices} />
              <Label>Also apply primary area to this seller's services ({target ? servicesOf(target.user_id).length : 0})</Label>
            </div>
            <Button className="w-full" onClick={saveAllocation} disabled={saving}>
              {saving ? "Saving..." : `Save ${totalSelected} allocation(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilitySellerRegistrations;
