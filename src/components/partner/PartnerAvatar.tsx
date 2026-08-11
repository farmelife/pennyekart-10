import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  className?: string;
  editable?: boolean;
  size?: "sm" | "md";
}

const PartnerAvatar = ({ className = "", editable = true, size = "sm" }: Props) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);

  const initials = (profile?.full_name || "P")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;
    setBusy(true);
    const path = `avatars/${profile.user_id}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", profile.user_id);
      setUrl(data.publicUrl);
      toast({ title: "Profile picture updated" });
    }
    setBusy(false);
  };

  const dim = size === "md" ? "h-12 w-12" : "h-9 w-9";

  return (
    <div className={`relative ${className}`}>
      <Avatar className={`${dim} border border-border`}>
        {url && <AvatarImage src={url} alt={profile?.full_name || "Partner"} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      {editable && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 rounded-full bg-background p-1 shadow border border-border"
          aria-label="Change profile picture"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default PartnerAvatar;
