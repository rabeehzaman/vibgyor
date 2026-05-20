"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Action label shown in the dialog (e.g. "Fund Transfer", "Balance Enquiry"). */
  actionLabel?: string;
}

/**
 * Dual-mode PIN dialog:
 * - If the customer doesn't have a PIN yet (legacy/edge case), it asks them to set one up.
 * - Otherwise, it prompts for the existing PIN before completing a sensitive action.
 */
export function PinDialog({ open, onClose, onSuccess, actionLabel }: PinDialogProps) {
  const { customer, setupPin, verifyCustomerPin } = useCustomerAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSetupMode = !customer?.hasPin;

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setError("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    setSubmitting(true);
    try {
      if (isSetupMode) {
        if (pin !== confirmPin) {
          setError("PINs do not match");
          return;
        }
        const res = await setupPin(pin);
        if (!res.success) {
          setError(res.error || "Failed to set PIN");
          return;
        }
        onSuccess();
      } else {
        const ok = await verifyCustomerPin(pin);
        if (!ok) {
          setError("Incorrect PIN. Please try again.");
          return;
        }
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isSetupMode ? <Lock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center">
            {isSetupMode ? "Set up your PIN" : "Enter your PIN"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSetupMode
              ? "Create a 4-digit PIN to authorize sensitive actions."
              : actionLabel
                ? `Confirm "${actionLabel}" with your 4-digit PIN.`
                : "Confirm this action with your 4-digit PIN."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="pin-input" className="sr-only">PIN</Label>
            <Input
              id="pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              required
              autoComplete="off"
              className="h-14 text-center text-2xl tracking-[1em]"
            />
          </div>

          {isSetupMode && (
            <div>
              <Label htmlFor="pin-confirm" className="sr-only">Confirm PIN</Label>
              <Input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Confirm PIN"
                required
                autoComplete="off"
                className="h-12 text-center text-xl tracking-[1em]"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || pin.length !== 4}>
              {submitting ? "Verifying..." : isSetupMode ? "Save PIN" : "Confirm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
