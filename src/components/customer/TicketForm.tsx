"use client";

import { useState } from "react";
import { TicketType } from "@/lib/types";
import { getTicketFormFields } from "@/lib/ticket-utils";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TicketFormProps {
  type: TicketType;
  onSubmit: (data: {
    customerName: string;
    customerMobile: string;
    accountNumber: string;
    details: Record<string, string | number>;
  }) => void;
  onCancel: () => void;
  defaultValues?: {
    customerName?: string;
    customerMobile?: string;
    accountNumber?: string;
  };
  defaultDetails?: Record<string, string | number>;
  lockedDetailKeys?: string[];
}

export function TicketForm({ type, onSubmit, onCancel, defaultValues, defaultDetails, lockedDetailKeys }: TicketFormProps) {
  const [customerName, setCustomerName] = useState(defaultValues?.customerName || "");
  const [customerMobile, setCustomerMobile] = useState(defaultValues?.customerMobile || "");
  const [accountNumber, setAccountNumber] = useState(defaultValues?.accountNumber || "");
  const [details, setDetails] = useState<Record<string, string>>(() => {
    if (!defaultDetails) return {};
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaultDetails)) init[k] = String(v);
    return init;
  });

  const extraFields = getTicketFormFields(type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDetails: Record<string, string | number> = {};
    for (const field of extraFields) {
      const val = details[field.key] || "";
      parsedDetails[field.key] = field.type === "number" ? Number(val) || 0 : val;
    }
    onSubmit({ customerName, customerMobile, accountNumber, details: parsedDetails });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 text-sm font-medium text-center">
        {TICKET_TYPE_LABELS[type]}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="customerName">Full Name *</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter your full name"
            required
            readOnly={!!defaultValues?.customerName}
            className={defaultValues?.customerName ? "bg-muted text-muted-foreground" : ""}
          />
        </div>
        <div>
          <Label htmlFor="customerMobile">Mobile Number *</Label>
          <Input
            id="customerMobile"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            placeholder="10-digit mobile number"
            required
            readOnly={!!defaultValues?.customerMobile}
            className={defaultValues?.customerMobile ? "bg-muted text-muted-foreground" : ""}
          />
        </div>
        <div>
          <Label htmlFor="accountNumber">Account Number *</Label>
          <Input
            id="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Your account number"
            required
            readOnly={!!defaultValues?.accountNumber}
            className={defaultValues?.accountNumber ? "bg-muted text-muted-foreground" : ""}
          />
        </div>

        {extraFields.map((field) => {
          const isLocked = lockedDetailKeys?.includes(field.key) ?? false;
          const lockedClass = isLocked ? "bg-muted text-muted-foreground" : "";
          return (
            <div key={field.key}>
              <Label htmlFor={field.key}>
                {field.label} {field.required && "*"}
              </Label>
              {field.type === "select" ? (
                <Select
                  value={details[field.key] || ""}
                  onValueChange={(v) => setDetails((prev) => ({ ...prev, [field.key]: v }))}
                  required={field.required}
                  disabled={isLocked}
                >
                  <SelectTrigger className={lockedClass}>
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  id={field.key}
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.required}
                  readOnly={isLocked}
                  className={lockedClass}
                  rows={4}
                />
              ) : (
                <Input
                  id={field.key}
                  type={field.type}
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  required={field.required}
                  readOnly={isLocked}
                  className={lockedClass}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Submit Request
        </Button>
      </div>
    </form>
  );
}
