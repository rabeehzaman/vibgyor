"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  ArrowLeftRight,
  BookOpen,
  FileText,
  Smartphone,
  MessageSquareWarning,
  Search,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useApp } from "@/context/AppContext";
import {
  TICKET_TYPE_LABELS,
  TICKET_TYPE_DEFAULT_PRIORITY,
} from "@/lib/constants";
import { generateTicketId, generateReferenceNumber } from "@/lib/ticket-utils";
import { TicketType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceCard } from "@/components/customer/ServiceCard";
import { TicketForm } from "@/components/customer/TicketForm";
import { TicketConfirmation } from "@/components/customer/TicketConfirmation";
import { PinDialog } from "@/components/customer/PinDialog";

type ServiceDef = {
  type: TicketType;
  icon: typeof Wallet;
  description: string;
  /** If true, this service requires PIN verification before submission. */
  pinProtected: boolean;
  /** If set, clicking the card navigates here instead of opening the ticket form. */
  href?: string;
};

const services: ServiceDef[] = [
  {
    type: "TransferRequest",
    icon: ArrowLeftRight,
    description: "Send money to your beneficiaries",
    pinProtected: true,
    href: "/customer/transfer",
  },
  {
    type: "BalanceEnquiry",
    icon: Wallet,
    description: "Check your account balance",
    pinProtected: true,
  },
  {
    type: "ChequeBookRequest",
    icon: BookOpen,
    description: "Request a new cheque book",
    pinProtected: true,
  },
  {
    type: "MobileNumberChange",
    icon: Smartphone,
    description: "Update your mobile number",
    pinProtected: true,
  },
  {
    type: "Complaint",
    icon: MessageSquareWarning,
    description: "Register a complaint",
    pinProtected: false,
  },
];

interface PendingSubmission {
  type: TicketType;
  data: {
    customerName: string;
    customerMobile: string;
    accountNumber: string;
    details: Record<string, string | number>;
  };
}

export default function CustomerDashboard() {
  const { customer, isLoading } = useCustomerAuth();
  const { tickets, addTicket } = useApp();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedType, setSubmittedType] = useState<TicketType | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);

  useEffect(() => {
    if (!isLoading && !customer) router.replace("/customer/login");
  }, [isLoading, customer, router]);

  if (isLoading || !customer) return null;

  const myTickets = tickets
    .filter((t) => t.customerMobile === customer.mobile)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openCount = myTickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  ).length;

  const finalizeTicket = (submission: PendingSubmission) => {
    const now = new Date().toISOString();
    const refNumber = generateReferenceNumber(tickets);
    addTicket({
      id: generateTicketId(),
      referenceNumber: refNumber,
      type: submission.type,
      status: "Open",
      priority: TICKET_TYPE_DEFAULT_PRIORITY[submission.type],
      customerName: submission.data.customerName,
      customerMobile: submission.data.customerMobile,
      accountNumber: submission.data.accountNumber,
      details: submission.data.details,
      createdAt: now,
      updatedAt: now,
      replies: [],
    });
    setSubmittedRef(refNumber);
    setSubmittedType(submission.type);
    setSelectedType(null);
  };

  const handleServiceClick = (svc: ServiceDef) => {
    if (svc.href) {
      router.push(svc.href);
      return;
    }
    setSelectedType(svc.type);
  };

  const handleFormSubmit = (data: PendingSubmission["data"]) => {
    if (!selectedType) return;
    const svc = services.find((s) => s.type === selectedType);
    const submission: PendingSubmission = { type: selectedType, data };

    if (svc?.pinProtected) {
      setPendingSubmission(submission);
      setPinOpen(true);
    } else {
      finalizeTicket(submission);
    }
  };

  const handlePinSuccess = () => {
    setPinOpen(false);
    if (pendingSubmission) {
      finalizeTicket(pendingSubmission);
      setPendingSubmission(null);
    }
  };

  const handlePinClose = () => {
    setPinOpen(false);
    setPendingSubmission(null);
  };

  const closeFormDialog = () => setSelectedType(null);
  const closeConfirmation = () => {
    setSubmittedRef(null);
    setSubmittedType(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Welcome Section */}
      <div className="animate-fade-in relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold md:text-3xl">
            Welcome, {customer.name}
          </h1>
          <p className="mt-1 text-white/70 text-sm">
            Account: {customer.accountNumber}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Link href="/customer/track">
                <Search className="mr-1.5 h-4 w-4" /> Track by Reference
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-white/15 text-white hover:bg-white/25 border-0"
            >
              <Link href="/customer/transfer">
                <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Fund Transfer
              </Link>
            </Button>
          </div>
        </div>
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myTickets.length}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myTickets.length - openCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Services</CardTitle>
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <ShieldCheck className="h-3 w-3" /> PIN-protected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 stagger-children">
            {services.map((svc) => (
              <ServiceCard
                key={svc.type}
                icon={svc.icon}
                label={TICKET_TYPE_LABELS[svc.type]}
                description={svc.description}
                onClick={() => handleServiceClick(svc)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {myTickets.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No requests yet — select a service above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/customer/ticket/${t.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.referenceNumber}
                      </span>
                      <StatusBadge status={t.status} dot />
                    </div>
                    <p className="mt-0.5 text-sm font-medium truncate">
                      {TICKET_TYPE_LABELS[t.type]}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {format(new Date(t.createdAt), "dd MMM yyyy")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedType !== null}
        onOpenChange={(v) => { if (!v) closeFormDialog(); }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
          </DialogHeader>
          {selectedType && (
            <TicketForm
              type={selectedType}
              onSubmit={handleFormSubmit}
              onCancel={closeFormDialog}
              defaultValues={{
                customerName: customer.name,
                customerMobile: customer.mobile,
                accountNumber: customer.accountNumber,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <PinDialog
        open={pinOpen}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
        actionLabel={
          pendingSubmission ? TICKET_TYPE_LABELS[pendingSubmission.type] : undefined
        }
      />

      <Dialog
        open={submittedRef !== null}
        onOpenChange={(v) => { if (!v) closeConfirmation(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Request Submitted</DialogTitle>
          </DialogHeader>
          {submittedRef && submittedType && (
            <TicketConfirmation
              referenceNumber={submittedRef}
              type={submittedType}
              onNewRequest={closeConfirmation}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
