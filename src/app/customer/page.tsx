"use client";

import { useState } from "react";
import {
  Wallet,
  ArrowLeftRight,
  BookOpen,
  BookText,
  FileText,
  Smartphone,
  CreditCard,
  Phone,
  MessageSquareWarning,
  Landmark,
  PiggyBank,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceCard } from "@/components/customer/ServiceCard";
import { TicketForm } from "@/components/customer/TicketForm";
import { TicketConfirmation } from "@/components/customer/TicketConfirmation";
import { useApp } from "@/context/AppContext";
import { TicketType } from "@/lib/types";
import { TICKET_TYPE_LABELS, TICKET_TYPE_DEFAULT_PRIORITY } from "@/lib/constants";
import { generateTicketId, generateReferenceNumber } from "@/lib/ticket-utils";

const services: { type: TicketType; icon: typeof Wallet; description: string }[] = [
  { type: "BalanceEnquiry", icon: Wallet, description: "Check your account balance" },
  { type: "TransferRequest", icon: ArrowLeftRight, description: "Request a fund transfer" },
  { type: "ChequeBookRequest", icon: BookOpen, description: "Request a new cheque book" },
  { type: "PassbookRequest", icon: BookText, description: "Request passbook update" },
  { type: "DDBookRequest", icon: FileText, description: "Request a demand draft" },
  { type: "MobileNumberChange", icon: Smartphone, description: "Update your mobile number" },
  { type: "AccountDetails", icon: CreditCard, description: "Get your account details" },
  { type: "CurrentMobileNumber", icon: Phone, description: "Check registered mobile" },
  { type: "Complaint", icon: MessageSquareWarning, description: "Register a complaint" },
  { type: "LoanStatusInquiry", icon: Landmark, description: "Check loan status" },
  { type: "FDRDMaturityInquiry", icon: PiggyBank, description: "FD/RD maturity info" },
];

export default function CustomerPage() {
  const { tickets, addTicket } = useApp();
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedType, setSubmittedType] = useState<TicketType | null>(null);

  const handleSubmit = (data: {
    customerName: string;
    customerMobile: string;
    accountNumber: string;
    details: Record<string, string | number>;
  }) => {
    if (!selectedType) return;
    const now = new Date().toISOString();
    const refNumber = generateReferenceNumber(tickets);
    const ticket = {
      id: generateTicketId(),
      referenceNumber: refNumber,
      type: selectedType,
      status: "Open" as const,
      priority: TICKET_TYPE_DEFAULT_PRIORITY[selectedType],
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      accountNumber: data.accountNumber,
      details: data.details,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
    addTicket(ticket);
    setSubmittedRef(refNumber);
    setSubmittedType(selectedType);
    setSelectedType(null);
  };

  const handleClose = () => {
    setSelectedType(null);
    setSubmittedRef(null);
    setSubmittedType(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">Welcome to VIBGYOR Bank</h1>
        <p className="mt-2 text-muted-foreground">
          How can we help you today? Select a service to get started.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

      {/* Service Request Form Dialog */}
      <Dialog open={selectedType !== null} onOpenChange={() => setSelectedType(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
          </DialogHeader>
          {selectedType && (
            <TicketForm
              type={selectedType}
              onSubmit={handleSubmit}
              onCancel={() => setSelectedType(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={submittedRef !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Request Submitted</DialogTitle>
          </DialogHeader>
          {submittedRef && submittedType && (
            <TicketConfirmation
              referenceNumber={submittedRef}
              type={submittedType}
              onNewRequest={handleClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
