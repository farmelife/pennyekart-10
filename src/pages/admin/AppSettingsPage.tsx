import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ExternalLink } from "lucide-react";
import carbsLogo from "@/assets/carbs-logo.png";

const AppSettingsPage = () => {
  const { toast } = useToast();
  const [carbsUrl, setCarbsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "pennycarbs_url")
        .single();
      setCarbsUrl(data?.value ?? "");
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: carbsUrl.trim() })
        .eq("key", "pennycarbs_url");

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Penny Carbs URL has been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving settings",
        description: err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold">App Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Penny Carbs Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <img src={carbsLogo} alt="Penny Carbs" className="h-6" />
              <div>
                <CardTitle>Penny Carbs — Food Delivery</CardTitle>
                <CardDescription>
                  Configure the external food delivery website URL. Customers will see this embedded inside the app.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="carbsUrl">External Website URL</Label>
                  <Input
                    id="carbsUrl"
                    type="url"
                    placeholder="https://your-food-delivery-site.com"
                    value={carbsUrl}
                    onChange={(e) => setCarbsUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full URL of your Penny Carbs food delivery website. Leave blank to show "Coming Soon" to customers.
                  </p>
                </div>

                {carbsUrl && (
                  <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">{carbsUrl}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto shrink-0 h-auto py-0.5 px-2 text-xs"
                      onClick={() => window.open(carbsUrl, "_blank")}
                    >
                      Test
                    </Button>
                  </div>
                )}

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AppSettingsPage;
