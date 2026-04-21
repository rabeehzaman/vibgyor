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
  Landmark,
  PiggyBank,
  Search,
  Clock,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useApp } from "@/context/AppContext";
import { TICKET_TYPE_LABELS, TICKET_TYPE_DEFAULT_PRIORITY } from "@/lib/constants";
import { generateTicketId, generateReferenceNumber } from "@/lib/ticket-utils";
import { Scheme, TicketType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceCard } from "@/components/customer/ServiceCard";
import { TicketForm } from "@/components/customer/TicketForm";
import { TicketConfirmation } from "@/components/customer/TicketConfirmation";

const services: { type: TicketType; icon: typeof Wallet; description: string }[] = [
  { type: "BalanceEnquiry", icon: Wallet, description: "Check your account balance" },
  { type: "TransferRequest", icon: ArrowLeftRight, description: "Request a fund transfer" },
  { type: "ChequeBookRequest", icon: BookOpen, description: "Request a new cheque book" },
  { type: "MobileNumberChange", icon: Smartphone, description: "Update your mobile number" },
  { type: "Complaint", icon: MessageSquareWarning, description: "Register a complaint" },
  { type: "LoanStatusInquiry", icon: Landmark, description: "Check loan status" },
  { type: "FDRDMaturityInquiry", icon: PiggyBank, description: "FD/RD maturity info" },
];

type ApplyContext = {
  type: TicketType;
  defaultDetails: Record<string, string | number>;
  lockedDetailKeys: string[];
};

export default function CustomerDashboard() {
  const { customer, isLoading } = useCustomerAuth();
  const { tickets, addTicket, schemes } = useApp();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [applyCtx, setApplyCtx] = useState<ApplyContext | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedType, setSubmittedType] = useState<TicketType | null>(null);

  useEffect(() => {
    if (!isLoading && !customer) router.replace("/customer/login");
  }, [isLoading, customer, router]);

  if (isLoading || !customer) return null;

  const myTickets = tickets
    .filter((t) => t.customerMobile === customer.mobile)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openCount = myTickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;

  const depositSchemes = schemes.filter((s) => (s.type === "RD" || s.type === "FD") && s.active !== false);
  const loanSchemes = schemes.filter((s) => s.type === "Loan" && s.active !== false);

  const activeType = applyCtx?.type ?? selectedType;

  const handleApplyScheme = (s: Scheme) => {
    if (s.type === "Loan") {
      setApplyCtx({
        type: "LoanApplication",
        defaultDetails: { scheme: s.name },
        lockedDetailKeys: ["scheme"],
      });
    } else {
      setApplyCtx({
        type: "DepositApplication",
        defaultDetails: {
          scheme: s.name,
          depositType: s.type === "FD" ? "FD" : "RD",
        },
        lockedDetailKeys: ["scheme", "depositType"],
      });
    }
  };

  const handleSubmit = (data: {
    customerName: string;
    customerMobile: string;
    accountNumber: string;
    details: Record<string, string | number>;
  }) => {
    const type = activeType;
    if (!type) return;
    const now = new Date().toISOString();
    const refNumber = generateReferenceNumber(tickets);
    addTicket({
      id: generateTicketId(),
      referenceNumber: refNumber,
      type,
      status: "Open",
      priority: TICKET_TYPE_DEFAULT_PRIORITY[type],
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      accountNumber: data.accountNumber,
      details: data.details,
      createdAt: now,
      updatedAt: now,
      replies: [],
    });
    setSubmittedRef(refNumber);
    setSubmittedType(type);
    setSelectedType(null);
    setApplyCtx(null);
  };

  const closeFormDialog = () => {
    setSelectedType(null);
    setApplyCtx(null);
  };

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
            <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/customer/track">
                <Search className="mr-1.5 h-4 w-4" /> Track by Reference
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

      {/* Main tabs */}
      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposits">
            <PiggyBank className="mr-1.5 h-4 w-4" /> Deposits
          </TabsTrigger>
          <TabsTrigger value="loans">
            <Landmark className="mr-1.5 h-4 w-4" /> Loans
          </TabsTrigger>
          <TabsTrigger value="requests">
            <FileText className="mr-1.5 h-4 w-4" /> Requests
            {myTickets.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {myTickets.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Deposits tab */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deposit Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <SchemeGrid
                schemes={depositSchemes}
                emptyMessage="No deposit schemes are available right now."
                onApply={handleApplyScheme}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans tab */}
        <TabsContent value="loans">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Loan Schemes</CardTitle>
            </CardHeader>
            <CardContent>
              <SchemeGrid
                schemes={loanSchemes}
                emptyMessage="No loan schemes are available right now."
                onApply={handleApplyScheme}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 stagger-children">
                {services.map((svc) => (
                  <ServiceCard
                    key={svc.type}
                    icon={svc.icon}
                    label={TICKET_TYPE_LABELS[svc.type]}
                    description={svc.description}
                    onClick={() => setSelectedType(svc.type)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">My Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {myTickets.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No requests yet — select a service above to get started.</p>
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
        </TabsContent>
      </Tabs>

      <Dialog open={activeType !== null} onOpenChange={(v) => { if (!v) closeFormDialog(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
          </DialogHeader>
          {activeType && (
            <TicketForm
              type={activeType}
              onSubmit={handleSubmit}
              onCancel={closeFormDialog}
              defaultValues={{
                customerName: customer.name,
                customerMobile: customer.mobile,
                accountNumber: customer.accountNumber,
              }}
              defaultDetails={applyCtx?.defaultDetails}
              lockedDetailKeys={applyCtx?.lockedDetailKeys}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={submittedRef !== null} onOpenChange={(v) => { if (!v) closeConfirmation(); }}>
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

function SchemeGrid({
  schemes,
  emptyMessage,
  onApply,
}: {
  schemes: Scheme[];
  emptyMessage: string;
  onApply: (s: Scheme) => void;
}) {
  if (schemes.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
      {schemes.map((s) => (
        <SchemeCard key={s.id} scheme={s} onApply={() => onApply(s)} />
      ))}
    </div>
  );
}

function SchemeCard({ scheme, onApply }: { scheme: Scheme; onApply: () => void }) {
  const typeColors: Record<Scheme["type"], string> = {
    RD: "bg-green-500/10 text-green-600",
    FD: "bg-yellow-500/10 text-yellow-600",
    Loan: "bg-blue-500/10 text-blue-600",
    Membership: "bg-purple-500/10 text-purple-600",
  };
  const Icon = scheme.type === "Loan" ? Landmark : PiggyBank;
  const applyLabel = scheme.type === "Loan" ? "Apply for Loan" : "Open Account";

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${typeColors[scheme.type]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{scheme.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{scheme.type}</p>
          </div>
        </div>
        {scheme.interestRate != null && (
          <Badge variant="outline" className="border-primary/30 text-primary">
            <TrendingUp className="mr-1 h-3 w-3" /> {scheme.interestRate}%
          </Badge>
        )}
      </div>

      {scheme.description && (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{scheme.description}</p>
      )}

      <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {scheme.tenureMonths != null && (
          <>
            <dt className="text-muted-foreground">Tenure</dt>
            <dd className="text-right font-medium">{scheme.tenureMonths} months</dd>
          </>
        )}
        {scheme.minAmount != null && (
          <>
            <dt className="text-muted-foreground">
              {scheme.type === "Loan" ? "Min loan" : "Min amount"}
            </dt>
            <dd className="text-right font-medium">₹{scheme.minAmount.toLocaleString("en-IN")}</dd>
          </>
        )}
        {scheme.maxAmount != null && (
          <>
            <dt className="text-muted-foreground">Max loan</dt>
            <dd className="text-right font-medium">₹{scheme.maxAmount.toLocaleString("en-IN")}</dd>
          </>
        )}
      </dl>

      {scheme.features && scheme.features.length > 0 && (
        <ul className="mb-4 space-y-1">
          {scheme.features.slice(0, 3).map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <Button size="sm" className="mt-auto w-full" onClick={onApply}>
        {applyLabel}
      </Button>
    </div>
  );
}
