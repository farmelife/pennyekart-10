import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, ImageDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
  bucket: string;
  value: string;
  onChange: (url: string, meta?: { provider?: string; status?: string }) => void;
  label?: string;
  useExternalStorage?: boolean;
  /** Show compression presets + before/after size info (used on product forms) */
  enableCompressionOptions?: boolean;
}

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB source limit (compressed down before upload)
const HARD_LIMIT_NO_COMPRESS = 1 * 1024 * 1024; // 1MB when compression is disabled
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type PresetKey = "small" | "balanced" | "high";

const PRESETS: Record<PresetKey, { label: string; targetKB: number; maxDim: number }> = {
  small: { label: "Small (50KB)", targetKB: 50, maxDim: 900 },
  balanced: { label: "Balanced (100KB)", targetKB: 100, maxDim: 1200 },
  high: { label: "High quality (300KB)", targetKB: 300, maxDim: 1600 },
};

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`);

const compressImage = (file: File, targetBytes: number, maxDim = 1200): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Scale down if very large
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively reduce quality to hit target
      let quality = 0.85;
      let blob: Blob | null = null;
      for (let i = 0; i < 8; i++) {
        blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/webp", quality));
        if (!blob || blob.size <= targetBytes) break;
        quality -= 0.1;
        if (quality < 0.3) quality = 0.3;
      }

      if (!blob) return reject(new Error("Compression failed"));
      const compressed = new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
      resolve(compressed);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
};

const ImageUpload = ({ bucket, value, onChange, label, useExternalStorage = true, enableCompressionOptions = false }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<{ provider?: string; status?: string; size?: string; original?: string; saved?: number } | null>(null);
  const [preset, setPreset] = useState<PresetKey>("balanced");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadMeta(null);

    const sizeLimit = enableCompressionOptions ? MAX_FILE_SIZE : HARD_LIMIT_NO_COMPRESS;
    if (file.size > sizeLimit) {
      setError(`File size exceeds ${formatSize(sizeLimit)} limit`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only jpg, jpeg, png, webp formats allowed");
      return;
    }

    setUploading(true);

    // Auto-compress to the selected target size
    const target = PRESETS[enableCompressionOptions ? preset : "balanced"];
    const targetBytes = target.targetKB * 1024;
    let optimizedFile = file;
    try {
      if (file.size > targetBytes) {
        optimizedFile = await compressImage(file, targetBytes, target.maxDim);
      }
    } catch {
      console.warn("Compression failed, using original file");
    }
    const originalLabel = formatSize(file.size);
    const savedPct = file.size > optimizedFile.size ? Math.round((1 - optimizedFile.size / file.size) * 100) : 0;

    if (useExternalStorage) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Please log in to upload");
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", optimizedFile);

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "xxlocaexuoowxdzupjcs";
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/upload-image`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        const data = await res.json();
        if (!res.ok) {
          // Fallback to Supabase storage
          console.warn("External upload failed, falling back to Supabase storage:", data.error);
          await fallbackToSupabase(optimizedFile, originalLabel, savedPct);
          return;
        }

        setUploadMeta({ provider: data.provider, status: data.status, size: formatSize(optimizedFile.size), original: originalLabel, saved: savedPct });
        onChange(data.url, { provider: data.provider, status: data.status });
      } catch (err) {
        console.warn("External upload error, falling back:", err);
        await fallbackToSupabase(optimizedFile, originalLabel, savedPct);
      }
    } else {
      await fallbackToSupabase(optimizedFile, originalLabel, savedPct);
    }

    setUploading(false);
  };

  const fallbackToSupabase = async (file: File, originalLabel?: string, savedPct = 0) => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    setUploadMeta({ provider: "supabase", status: "fallback", size: formatSize(file.size), original: originalLabel, saved: savedPct });
    onChange(urlData.publicUrl, { provider: "supabase", status: "fallback" });
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      {enableCompressionOptions && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-dashed bg-muted/40 p-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ImageDown className="h-3.5 w-3.5" /> Compress to
          </span>
          {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPreset(k)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                preset === k ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"
              }`}
            >
              {PRESETS[k].label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or upload"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => { onChange(""); setUploadMeta(null); setError(null); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {uploadMeta?.provider && (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {uploadMeta.provider}
          </Badge>
          {uploadMeta.status === "fallback" && (
            <Badge variant="secondary" className="text-[10px]">fallback</Badge>
          )}
          {uploadMeta.size && (
            <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              optimized: {uploadMeta.size}
            </Badge>
          )}
          {uploadMeta.original && uploadMeta.saved ? (
            <Badge variant="secondary" className="text-[10px]">
              {uploadMeta.original} → saved {uploadMeta.saved}%
            </Badge>
          ) : null}
        </div>
      )}
      {value && (
        <img src={value} alt="Preview" className="h-20 w-20 rounded-md border object-cover" />
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default ImageUpload;
