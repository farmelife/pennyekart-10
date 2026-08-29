import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, ShieldCheck, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  profileMobile: string | null;
}

const CODE_TTL_MINUTES = 10;

const VerifyAccountCard = ({ userId, profileMobile }: Props) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    setIsVerified(Boolean((data as { is_verified?: boolean } | null)?.is_verified));
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const normalize = (v: string | null) => (v ? digitsOnly(v).slice(-10) : "");

  const handleSendCode = async () => {
    setMismatch(false);
    const entered = normalize(mobile);
    if (entered.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!profileMobile || entered !== normalize(profileMobile)) {
      setMismatch(true);
      return;
    }

    setBusy(true);
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({ verification_code: generated, verification_code_expires_at: expires } as never)
      .eq("user_id", userId);
    setBusy(false);

    if (error) {
      toast.error("Could not start verification. Please try again.");
      return;
    }

    const text = encodeURIComponent(
      `Pennyekart account verification\n\nYour verification code is: ${generated}\n\nValid for ${CODE_TTL_MINUTES} minutes. Do not share this code with anyone.`,
    );
    window.open(`https://wa.me/91${entered}?text=${text}`, "_blank");
    setStep("code");
    toast.success("Verification code sent to your WhatsApp");
  };

  const handleVerify = async () => {
    const entered = digitsOnly(code);
    if (entered.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const { data } = await supabase
      .from("profiles")
      .select("verification_code, verification_code_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const row = data as { verification_code?: string | null; verification_code_expires_at?: string | null } | null;

    if (!row?.verification_code || !row.verification_code_expires_at || new Date(row.verification_code_expires_at) < new Date()) {
      setBusy(false);
      toast.error("Code expired. Please request a new code.");
      setStep("mobile");
      return;
    }

    if (row.verification_code !== entered) {
      setBusy(false);
      toast.error("Incorrect code. Please check your WhatsApp message.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        verification_code: null,
        verification_code_expires_at: null,
      } as never)
      .eq("user_id", userId);
    setBusy(false);

    if (error) {
      toast.error("Verification failed. Please try again.");
      return;
    }

    setIsVerified(true);
    setOpen(false);
    setCode("");
    setStep("mobile");
    toast.success("Account verified!");
  };

  if (isVerified === null) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isVerified ? "bg-sky-500/10" : "bg-muted"}`}>
            {isVerified ? <BadgeCheck className="h-5 w-5 text-sky-500" /> : <ShieldCheck className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              {isVerified ? "Verified Account" : "Account not verified"}
              {isVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVerified
                ? "Your mobile number is verified on WhatsApp."
                : "Verify your mobile number on WhatsApp to get the blue tick."}
            </p>
          </div>
          {!isVerified && (
            <Button size="sm" onClick={() => { setMobile(""); setMismatch(false); setStep("mobile"); setOpen(true); }}>
              Verify
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{step === "mobile" ? "Verify your mobile number" : "Enter verification code"}</DialogTitle>
            <DialogDescription>
              {step === "mobile"
                ? "Enter the mobile number you used to sign up. We'll send a code to that number on WhatsApp."
                : "Open WhatsApp, send the pre-filled message to yourself, then type the 6-digit code below."}
            </DialogDescription>
          </DialogHeader>

          {step === "mobile" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="verify-mobile">Mobile Number</Label>
                <Input
                  id="verify-mobile"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={mobile}
                  onChange={(e) => { setMobile(digitsOnly(e.target.value).slice(0, 10)); setMismatch(false); }}
                />
              </div>
              {mismatch && (
                <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    This number does not match your registered mobile number. Please enter the number you used to sign up.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="verify-code">6-digit code</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                placeholder="000000"
                className="tracking-[0.5em] text-center text-lg"
                value={code}
                onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
              />
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("mobile")}>
                Didn't get it? Resend code
              </Button>
            </div>
          )}

          <DialogFooter>
            {step === "mobile" ? (
              <Button onClick={handleSendCode} disabled={busy} className="gap-2 w-full">
                <MessageCircle className="h-4 w-4" />
                {busy ? "Please wait..." : "Send code on WhatsApp"}
              </Button>
            ) : (
              <Button onClick={handleVerify} disabled={busy} className="w-full">
                {busy ? "Verifying..." : "Verify"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerifyAccountCard;
