import { Ticket, TicketType } from "./types";

export function generateTicketId(): string {
  return `tkt_${Date.now()}`;
}

export function generateReferenceNumber(existingTickets: Ticket[]): string {
  const year = new Date().getFullYear();
  const count = existingTickets.filter((t) =>
    t.referenceNumber.includes(`VBG-${year}`)
  ).length;
  const num = String(count + 1).padStart(5, "0");
  return `VBG-${year}-${num}`;
}

export interface TicketFormField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export function getTicketFormFields(type: TicketType): TicketFormField[] {
  switch (type) {
    case "BalanceEnquiry":
      return [];
    case "TransferRequest":
      return [
        { key: "toAccount", label: "To Account Number", type: "text", required: true },
        { key: "toName", label: "Beneficiary Name", type: "text", required: true },
        { key: "toIFSC", label: "IFSC Code", type: "text", required: true },
        { key: "amount", label: "Amount (₹)", type: "number", required: true },
        { key: "purpose", label: "Purpose", type: "text", placeholder: "e.g. Family, Business" },
      ];
    case "ChequeBookRequest":
      return [
        { key: "numberOfLeaves", label: "Number of Leaves", type: "select", required: true, options: ["25", "50", "100"] },
      ];
    case "MobileNumberChange":
      return [
        { key: "oldMobile", label: "Old Mobile Number", type: "text", required: true },
        { key: "newMobile", label: "New Mobile Number", type: "text", required: true },
      ];
    case "Complaint":
      return [
        { key: "complaint", label: "Complaint Details", type: "textarea", required: true, placeholder: "Describe your complaint..." },
      ];
    case "LoanStatusInquiry":
      return [
        { key: "loanAccountNumber", label: "Loan Account Number", type: "text", required: true },
      ];
    case "FDRDMaturityInquiry":
      return [
        { key: "depositType", label: "Deposit Type", type: "select", required: true, options: ["FD", "RD"] },
        { key: "depositAccountNumber", label: "Deposit Account Number", type: "text", required: true },
      ];
    case "DepositApplication":
      return [
        { key: "scheme", label: "Scheme", type: "text", required: true },
        { key: "depositType", label: "Deposit Type", type: "select", required: true, options: ["FD", "RD"] },
        { key: "amount", label: "Amount (₹)", type: "number", required: true },
        { key: "tenureMonths", label: "Preferred Tenure (months)", type: "number" },
        { key: "notes", label: "Notes", type: "textarea", placeholder: "Anything we should know?" },
      ];
    case "LoanApplication":
      return [
        { key: "scheme", label: "Scheme", type: "text", required: true },
        { key: "amount", label: "Loan Amount (₹)", type: "number", required: true },
        { key: "tenureMonths", label: "Preferred Tenure (months)", type: "number" },
        { key: "purpose", label: "Purpose", type: "text", placeholder: "e.g. Business expansion" },
        { key: "notes", label: "Notes", type: "textarea", placeholder: "Anything we should know?" },
      ];
    default:
      return [];
  }
}
