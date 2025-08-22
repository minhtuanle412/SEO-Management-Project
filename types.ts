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
  actualMonth: string; // YYYY-MM
  kpiPercentage: number;
  reportStatus: ReportStatus;
  reportSentDate?: string; // YYYY-MM-DD
  notes: string;
}

export interface MonthlyProgress {
  month: number;
  paymentStatus: PaymentStatus;
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
