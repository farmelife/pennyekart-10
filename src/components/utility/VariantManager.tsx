import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Package } from "lucide-react";
import { PRESET_PACKS, PRODUCT_UNITS, type UtilityVariant } from "@/lib/utilityServices";

interface Props {
  serviceId: string;
  serviceName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const emptyPack = { label: "", unit: "nos", pack_size: 1, price: 0, mrp: 0, stock: 0 };

const VariantManager = ({ serviceId, serviceName, open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [variants, setVariants] = useState<UtilityVariant[]>([]);
  const [form, setForm] = useState(emptyPack);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("utility_service_variants")
      .select("*")
      .eq("service_id", serviceId)
      .order("sort_order")
      .order("pack_size");
    setVariants((data as UtilityVariant[]) ?? []);
  };

  useEffect(() => {
    if (open && serviceId) load();
  }, [open, serviceId]);

  const addPack = async (pack: typeof emptyPack) => {
    if (!pack.label.trim()) {
      toast({ title: "Pack label is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("utility_service_variants").insert({
      service_id: serviceId,
      label: pack.label.trim(),
      unit: pack.unit,
      pack_size: pack.pack_size || 1,
      price: pack.price || 0,
      mrp: pack.mrp || 0,
      stock: pack.stock || 0,
      sort_order: variants.length,
    });
    setSaving(false);
    if (error) toast({ title: "Could not add pack", description: error.message, variant: "destructive" });
    else {
      setForm(emptyPack);
      load();
    }
  };

  const update = async (id: string, patch: Partial<UtilityVariant>) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } as UtilityVariant : v)));
    const { error } = await supabase.from("utility_service_variants").update(patch).eq("id", id);
    if (error) toast({ title: "Could not update pack", description: error.message, variant: "destructive" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("utility_service_variants").delete().eq("id", id);
    if (error) toast({ title: "Could not delete pack", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Packs — {serviceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Quick add a ready-made pack</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_PACKS.map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  disabled={saving || variants.some((v) => v.label === p.label)}
                  onClick={() => addPack({ ...emptyPack, ...p })}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Add a pack, then set its price and stock below.</p>
          </div>

          <div className="rounded-lg border p-3">
            <Label className="text-xs text-muted-foreground">Or create a custom pack</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Label</Label>
                <Input placeholder="e.g. 750 g" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pack size</Label>
                <Input type="number" min="0" value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: +e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Price ₹</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Stock</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
              </div>
            </div>
            <Button className="mt-3 w-full sm:w-auto" size="sm" disabled={saving} onClick={() => addPack(form)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add pack
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Existing packs ({variants.length})</Label>
            {variants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No packs yet</p>
            ) : (
              variants.map((v) => (
                <div key={v.id} className="flex flex-wrap items-end gap-2 rounded-lg border p-2">
                  <Badge variant="secondary" className="mb-1">{v.label}</Badge>
                  <div className="w-24">
                    <Label className="text-xs">Price ₹</Label>
                    <Input type="number" min="0" value={v.price} onChange={(e) => update(v.id, { price: +e.target.value })} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">MRP ₹</Label>
                    <Input type="number" min="0" value={v.mrp} onChange={(e) => update(v.id, { mrp: +e.target.value })} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Stock</Label>
                    <Input type="number" min="0" value={v.stock} onChange={(e) => update(v.id, { stock: +e.target.value })} />
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <Switch checked={v.is_active} onCheckedChange={(c) => update(v.id, { is_active: c })} />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <Button variant="ghost" size="sm" className="mb-1" onClick={() => remove(v.id)} aria-label={`Delete ${v.label}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantManager;