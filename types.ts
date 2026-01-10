
export enum PaymentStatus {
  Paid = 'Đã thanh toán',
  Unpaid = 'Chưa thanh toán',
}

export enum ReportStatus {
  Sent = 'Đã gửi',
  NotSent = 'Chưa gửi',
}

export enum CommissionStatus {
  Paid = 'Đã chi trả',
  Unpaid = 'Chưa chi trả',
  NotApplicable = 'Không áp dụng',
}

export enum PaymentType {
  Monthly = 'monthly',
  Milestone = 'milestone',
}

// --- AUTH & ROLES ---
export type UserRole = 'admin' | 'manager' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}
// --------------------

export interface KpiEntry {
  id: string;
  contractMonth: number;
  actualMonth: string; // YYYY-MM-DD. Stored as 'date' in DB.
  kpiPercentage: number;
  reportStatus: ReportStatus;
  reportSentDate?: string; // YYYY-MM-DD
  notes: string;
  customerConfirmationUrl?: string;
  commissionStatus: CommissionStatus;
  commissionPaidDate?: string; // YYYY-MM-DD
}

export interface MonthlyProgress {
  id: string;
  month: number;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string;
  installmentId?: string;
}

export interface PaymentInstallment {
  id: string;
  name: string;
  paymentPercentage: number;
  status: PaymentStatus;
  paymentProofUrl?: string;
}

// --- NEW TYPES FOR COMMISSION MODULE ---

export interface Department {
  id: string;
  name: string;
}

export interface Position {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  ho_ten: string;
  chuc_vu: Position;
  phong_ban: Department;
}

export interface ProjectAssignment {
  id: string; // id from phan_cong_du_an table
  project_id: string;
  nhan_su_id: string;
  nhan_su: Staff;
  ty_le_phan_cong?: number; // % Contribution (Default 100)
}

export interface CommissionConfig {
  id: string;
  chuc_vu: Position;
  ty_le_hoa_hong: number; // e.g., 5 for 5%
}

export interface CommissionPayout {
  id: string;
  project_id: string;
  staff_id: string;
  amount: number;
  month: string; // YYYY-MM format
  created_at: string;
  effort_percentage?: number; // Recorded effort % at time of snapshot
  // Các trường join (được lấy kèm khi query)
  nhan_su?: Staff;
  project?: Project; // Cẩn thận vòng lặp nếu Project chứa CommissionPayout
}

// --- END NEW TYPES ---

export interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  totalBudget: number;
  paymentType: PaymentType;
  monthlyBreakdown: MonthlyProgress[]; // For payment tracking
  kpiEntries: KpiEntry[]; // For KPI tracking
  installments: PaymentInstallment[];
  assignments: ProjectAssignment[]; // NEW: Staff assignments
  lookerStudioUrl?: string;
}
