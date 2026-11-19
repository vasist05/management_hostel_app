export type NavModule =
  | 'dashboard'
  | 'students'
  | 'student-profile'
  | 'rooms'
  | 'rent'
  | 'expenses'
  | 'electricity'
  | 'documents'
  | 'notifications'
  | 'reports'
  | 'settings';

export type QuickActionTrigger =
  | null
  | 'add-student'
  | 'add-room'
  | 'record-payment'
  | 'add-expense';

export type UserRole = 'owner' | 'manager' | 'warden' | 'accountant';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  lastLogin?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  address: string;
  totalFloors: number;
}

export type RoomType = 'Single' | 'Double' | 'Triple' | 'Four-sharing' | 'Custom';

export interface Bed {
  id: string;
  roomId: string;
  label: string;
  status: 'vacant' | 'occupied';
  occupantStudentId: string | null;
}

export interface Room {
  id: string;
  buildingId: string;
  floor: number;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  defaultRent: number;
  amenities: string[];
  beds: Bed[];
}

export type StudentStatus = 'active' | 'vacated';
export type Gender = 'Male' | 'Female' | 'Other';
export type IdProofType =
  | 'Aadhaar Card'
  | 'PAN Card'
  | 'Passport'
  | 'Driving License'
  | 'College/Company ID';

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  actor: string;
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  photoUrl?: string;
  gender: Gender;
  dob: string;
  phone: string;
  email: string;
  organization: string;
  permanentAddress: string;
  parentName: string;
  parentPhone: string;
  emergencyContact: string;
  idProofType: IdProofType;
  idProofNumber: string;
  joiningDate: string;
  vacatedDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  depositStatus: 'held' | 'partially_refunded' | 'refunded';
  depositRefundedAmount: number;
  buildingId: string | null;
  floor: number | null;
  roomId: string | null;
  bedId: string | null;
  status: StudentStatus;
  notes: string;
  activityHistory: ActivityLog[];
}

export type RentStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'advance';
export type PaymentMethod = 'UPI' | 'Cash' | 'Bank Transfer' | 'Other';

export interface RentLedgerEntry {
  id: string;
  studentId: string;
  billingMonth: string; // YYYY-MM
  dueDate: string;      // YYYY-MM-DD
  rentAmount: number;
  paidAmount: number;
  advanceApplied: number;
  balanceAmount: number;
  status: RentStatus;
}

export interface PaymentTransaction {
  id: string;
  receiptNo: string;
  studentId: string;
  ledgerId: string | null;
  billingMonth: string;
  amount: number;
  type: 'rent' | 'advance' | 'deposit';
  method: PaymentMethod;
  referenceNo: string;
  paidOn: string;
  notes: string;
  recordedBy: string;
}

export type ExpenseCategory =
  | 'Electricity'
  | 'Water'
  | 'Internet'
  | 'Food'
  | 'Maintenance'
  | 'Cleaning'
  | 'Staff Salary'
  | 'Repairs'
  | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  vendorName?: string;
  attachmentName?: string;
}

export interface ElectricityBill {
  id: string;
  billingMonth: string; // YYYY-MM
  meterScope: string;   // e.g., "Block A & B Main Meter" or "Room 201 Sub-Meter"
  roomId?: string | null;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number;
  fixedCharges: number;
  totalBill: number;
  status: 'paid' | 'pending';
  dueDate: string;
  paidDate?: string;
}

export type VerificationStatus = 'verified' | 'pending' | 'rejected';

export interface StudentDocument {
  id: string;
  studentId: string;
  docType: IdProofType | 'Police Verification' | 'Agreement';
  fileName: string;
  fileSize?: string;
  referenceNo: string;
  uploadedOn: string;
  status: VerificationStatus;
  verifiedBy?: string;
  remarks?: string;
}

export interface NotificationItem {
  id: string;
  category: 'rent_due' | 'rent_overdue' | 'registration' | 'vacating' | 'admin';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetModule?: NavModule;
  targetStudentId?: string;
}

export interface HostelSettings {
  hostelName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  gstNumber: string;
  rentDueDay: number;
  lateFeePerDay: number;
  defaultSecurityMonths: number;
  upiId: string;
  bankDetails: string;
  receiptFooter: string;
  notifyRentDueDaysBefore: number;
  autoGenerateRentOnFirst: boolean;
  smsRemindersEnabled: boolean;
  whatsappRemindersEnabled: boolean;
  compactTables: boolean;
}

export interface PersistedHostelState {
  buildings: Building[];
  rooms: Room[];
  students: Student[];
  rentLedger: RentLedgerEntry[];
  payments: PaymentTransaction[];
  expenses: Expense[];
  electricityBills: ElectricityBill[];
  documents: StudentDocument[];
  notifications: NotificationItem[];
  settings: HostelSettings;
  staff: AuthUser[];
}
