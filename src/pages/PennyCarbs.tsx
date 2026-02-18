import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import carbsLogo from "@/assets/carbs-logo.png";

const PennyCarbs = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "pennycarbs_url")
          .single();

        if (error) throw error;
        const val = data?.value?.trim();
        if (!val) {
          setError("Penny Carbs food delivery is not configured yet. Please check back soon.");
        } else {
          setUrl(val);
        }
      } catch {
        setError("Could not load Penny Carbs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b bg-card shadow-sm shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src={carbsLogo} alt="Penny Carbs" className="h-5" />
        <span className="font-semibold text-sm">Food Delivery</span>
        {url && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto p-2 text-muted-foreground"
            onClick={() => window.open(url, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-full bg-muted p-4">
              <AlertCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Coming Soon</h2>
            <p className="text-muted-foreground max-w-xs">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </div>
        )}

        {!loading && url && (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading Penny Carbs...</p>
                </div>
              </div>
            )}
            <iframe
              src={url}
              title="Penny Carbs Food Delivery"
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              allow="geolocation; camera; microphone; payment"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PennyCarbs;
