"use client";

import { CheckCircle2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { TicketType } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

interface TicketConfirmationProps {
  referenceNumber: string;
  type: TicketType;
  onNewRequest: () => void;
}

export function TicketConfirmation({ referenceNumber, type, onNewRequest }: TicketConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Request Submitted!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your {TICKET_TYPE_LABELS[type]} request has been received.
        </p>
      </div>

      <div className="w-full rounded-lg border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground mb-1">Reference Number</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold font-mono tracking-wider">{referenceNumber}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {copied && <p className="text-xs text-green-600 mt-1">Copied!</p>}
      </div>

      <p className="text-sm text-muted-foreground">
        Save this reference number to track your request status.
      </p>

      <div className="flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={onNewRequest}>
          New Request
        </Button>
        <Button className="flex-1" asChild>
          <Link href="/customer/track">
            <Search className="h-4 w-4 mr-1.5" />
            Track Request
          </Link>
        </Button>
      </div>
    </div>
  );
}
