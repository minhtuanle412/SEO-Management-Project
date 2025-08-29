export enum PaymentStatus {
  Paid = 'Đã thanh toán',
  Unpaid = 'Chưa thanh toán',
}

export enum ReportStatus {
  Sent = 'Đã gửi',
  NotSent = 'Chưa gửi',
}

export interface KpiEntry {
  id: string;
  contractMonth: number;
  actualMonth: string; // YYYY-MM-DD. Stored as 'date' in DB.
  kpiPercentage: number;
  reportStatus: ReportStatus;
  reportSentDate?: string; // YYYY-MM-DD
  notes: string;
  customerConfirmationUrl?: string;
}

export interface MonthlyProgress {
  id: string;
  month: number;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  monthlyBreakdown: MonthlyProgress[]; // For payment tracking
  kpiEntries: KpiEntry[]; // For KPI tracking
}