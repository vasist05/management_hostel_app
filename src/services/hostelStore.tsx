import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyBedAllocation,
  applyRentPayment,
  applyVacateStudent,
  calculateElectricityBill,
  countOccupiedBeds,
  validateBedAllocation,
} from '../logic/businessRules';
import {
  AuthUser,
  Building,
  ElectricityBill,
  Expense,
  HostelSettings,
  NavModule,
  NotificationItem,
  PaymentMethod,
  PaymentTransaction,
  PersistedHostelState,
  QuickActionTrigger,
  RentLedgerEntry,
  Room,
  RoomType,
  Student,
  StudentDocument,
  VerificationStatus,
} from '../types/hostel';
import { hostelRepository } from './repository';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface HostelContextValue extends PersistedHostelState {
  currentUser: AuthUser | null;
  activeModule: NavModule;
  selectedStudentId: string | null;
  quickAction: QuickActionTrigger;
  toasts: ToastMessage[];
  setActiveModule: (module: NavModule) => void;
  openStudentProfile: (studentId: string) => void;
  triggerQuickAction: (module: NavModule, action: QuickActionTrigger) => void;
  consumeQuickAction: () => void;
  login: (identifier: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  switchUserRole: (userId: string) => void;
  notifyToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  // Student actions
  addStudent: (
    payload: Omit<
      Student,
      'id' | 'studentCode' | 'activityHistory' | 'depositStatus' | 'depositRefundedAmount' | 'status'
    >
  ) => { ok: boolean; error?: string };
  updateStudent: (studentId: string, patch: Partial<Student>) => void;
  vacateStudent: (studentId: string, vacatedDate: string, refundAmount: number) => void;
  // Room & Bed actions
  addBuilding: (b: Omit<Building, 'id'>) => void;
  addRoom: (payload: {
    buildingId: string;
    floor: number;
    roomNumber: string;
    type: RoomType;
    capacity: number;
    defaultRent: number;
    amenities: string[];
  }) => { ok: boolean; error?: string };
  updateRoom: (
    roomId: string,
    patch: Partial<Pick<Room, 'roomNumber' | 'type' | 'defaultRent' | 'amenities' | 'floor'>>
  ) => void;
  deleteRoom: (roomId: string) => { ok: boolean; error?: string };
  assignOrTransferBed: (
    studentId: string,
    roomId: string,
    bedId: string,
    isTransfer: boolean
  ) => { ok: boolean; error?: string };
  vacateBedOnly: (roomId: string, bedId: string) => void;
  // Rent & Payments
  generateMonthlyRent: (billingMonth: string) => number;
  recordPayment: (params: {
    studentId: string;
    ledgerId: string | null;
    billingMonth: string;
    amount: number;
    type: 'rent' | 'advance' | 'deposit';
    method: PaymentMethod;
    referenceNo: string;
    paidOn: string;
    notes: string;
  }) => PaymentTransaction;
  // Expenses
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  // Electricity
  addElectricityBill: (payload: {
    billingMonth: string;
    meterScope: string;
    roomId?: string | null;
    previousReading: number;
    currentReading: number;
    ratePerUnit: number;
    fixedCharges: number;
    dueDate: string;
    status: 'paid' | 'pending';
  }) => void;
  toggleElectricityBillStatus: (billId: string) => void;
  deleteElectricityBill: (billId: string) => void;
  // Documents
  addDocument: (doc: Omit<StudentDocument, 'id' | 'uploadedOn' | 'status'>) => void;
  updateDocumentStatus: (docId: string, status: VerificationStatus, remarks?: string) => void;
  deleteDocument: (docId: string) => void;
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  // Settings & Staff
  updateSettings: (patch: Partial<HostelSettings>) => void;
  addStaffMember: (member: Omit<AuthUser, 'id'>) => void;
  toggleStaffStatus: (id: string) => void;
  resetDemoData: () => void;
}

const HostelContext = createContext<HostelContextValue | null>(null);

export const HostelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedHostelState>(() => hostelRepository.loadState());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('hm_v4_1_auth');
      return saved ? (JSON.parse(saved) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<QuickActionTrigger>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    hostelRepository.saveState(state);
  }, [state]);

  const notifyToast = (type: ToastMessage['type'], text: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openStudentProfile = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveModule('student-profile');
  };

  const triggerQuickAction = (module: NavModule, action: QuickActionTrigger) => {
    setActiveModule(module);
    setQuickAction(action);
  };

  const consumeQuickAction = () => {
    setQuickAction(null);
  };

  const login = (identifier: string, password: string) => {
    const clean = identifier.trim().toLowerCase();
    if (!clean || password.trim().length < 4) {
      return { ok: false, error: 'Enter your registered email/phone and password (min 4 characters).' };
    }
    const matched = state.staff.find(
      (u) =>
        u.active &&
        (u.email.toLowerCase() === clean ||
          u.phone.replace(/\s+/g, '') === clean.replace(/\s+/g, ''))
    );
    if (!matched) {
      return { ok: false, error: 'Account not found or inactive. Try one of the demo role accounts.' };
    }
    setCurrentUser(matched);
    try {
      sessionStorage.setItem('hm_v4_1_auth', JSON.stringify(matched));
    } catch {
      // ignore
    }
    notifyToast('success', `Signed in as ${matched.name} (${matched.role})`);
    return { ok: true };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('hm_v4_1_auth');
    } catch {
      // ignore
    }
    setActiveModule('dashboard');
    notifyToast('info', 'Signed out safely.');
  };

  const switchUserRole = (userId: string) => {
    const target = state.staff.find((u) => u.id === userId && u.active);
    if (!target) return;
    setCurrentUser(target);
    try {
      sessionStorage.setItem('hm_v4_1_auth', JSON.stringify(target));
    } catch {
      // ignore
    }
    notifyToast('info', `Switched active profile to ${target.name} (${target.role})`);
  };

  const addStudent: HostelContextValue['addStudent'] = (payload) => {
    const newId = `stu-${Date.now()}`;
    const codeNum = String(state.students.length + 1).padStart(3, '0');
    const newStudent: Student = {
      ...payload,
      id: newId,
      studentCode: `PG-2026-${codeNum}`,
      buildingId: null,
      floor: null,
      roomId: null,
      bedId: null,
      status: 'active',
      depositStatus: 'held',
      depositRefundedAmount: 0,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: payload.joiningDate,
          action: 'Tenant Registered',
          detail: 'Profile registered in HOSTEL MANAGER V4.1',
          actor: currentUser?.name || 'Owner',
        },
      ],
    };

    let nextRooms = state.rooms;
    let nextStudents = [newStudent, ...state.students];

    if (payload.roomId && payload.bedId) {
      const check = validateBedAllocation(
        nextRooms,
        nextStudents,
        newId,
        payload.roomId,
        payload.bedId,
        false
      );
      if (!check.ok) {
        return { ok: false, error: check.error };
      }
      const res = applyBedAllocation(
        nextRooms,
        nextStudents,
        newId,
        payload.roomId,
        payload.bedId,
        currentUser?.name || 'Owner'
      );
      nextRooms = res.rooms;
      nextStudents = res.students;
    }

    const currentMonth = '2026-11';
    const initialRent: RentLedgerEntry = {
      id: `led-${Date.now()}`,
      studentId: newId,
      billingMonth: currentMonth,
      dueDate: `${currentMonth}-${String(state.settings.rentDueDay).padStart(2, '0')}`,
      rentAmount: payload.monthlyRent,
      paidAmount: 0,
      advanceApplied: 0,
      balanceAmount: payload.monthlyRent,
      status: 'pending',
    };

    const newNotif: NotificationItem = {
      id: `not-${Date.now()}`,
      category: 'registration',
      title: 'New Tenant Registered',
      message: `${payload.fullName} registered (${newStudent.studentCode}).`,
      createdAt: new Date().toISOString().slice(0, 10),
      read: false,
      targetModule: 'students',
      targetStudentId: newId,
    };

    setState((prev) => ({
      ...prev,
      rooms: nextRooms,
      students: nextStudents,
      rentLedger: [initialRent, ...prev.rentLedger],
      notifications: [newNotif, ...prev.notifications],
    }));

    notifyToast('success', `${payload.fullName} registered successfully.`);
    return { ok: true };
  };

  const updateStudent = (studentId: string, patch: Partial<Student>) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
    }));
    notifyToast('success', 'Tenant record updated.');
  };

  const vacateStudent = (studentId: string, vacatedDate: string, refundAmount: number) => {
    const stu = state.students.find((s) => s.id === studentId);
    setState((prev) => {
      const { rooms, students } = applyVacateStudent(
        prev.rooms,
        prev.students,
        studentId,
        vacatedDate,
        refundAmount,
        currentUser?.name || 'Owner'
      );
      const notif: NotificationItem = {
        id: `not-${Date.now()}`,
        category: 'vacating',
        title: 'Tenant Vacated & Bed Released',
        message: `${stu?.fullName || 'Tenant'} vacated on ${vacatedDate}. Bed is now vacant.`,
        createdAt: vacatedDate,
        read: false,
        targetModule: 'rooms',
      };
      return { ...prev, rooms, students, notifications: [notif, ...prev.notifications] };
    });
    notifyToast('info', 'Tenant vacated and bed released.');
  };

  const addBuilding = (b: Omit<Building, 'id'>) => {
    setState((prev) => ({
      ...prev,
      buildings: [...prev.buildings, { ...b, id: `bld-${Date.now()}` }],
    }));
    notifyToast('success', `Building "${b.name}" added.`);
  };

  const addRoom: HostelContextValue['addRoom'] = (payload) => {
    const duplicate = state.rooms.some(
      (r) =>
        r.buildingId === payload.buildingId &&
        r.roomNumber.toLowerCase() === payload.roomNumber.trim().toLowerCase()
    );
    if (duplicate) {
      return { ok: false, error: `Room ${payload.roomNumber} already exists in this building.` };
    }
    const roomId = `rm-${Date.now()}`;
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const beds = Array.from({ length: payload.capacity }, (_, i) => ({
      id: `bed-${roomId}-${i}`,
      roomId,
      label: labels[i] || String(i + 1),
      status: 'vacant' as const,
      occupantStudentId: null,
    }));
    const newRoom: Room = { ...payload, id: roomId, beds };
    setState((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
    notifyToast('success', `Room ${payload.roomNumber} (${payload.capacity} beds) created.`);
    return { ok: true };
  };

  const updateRoom: HostelContextValue['updateRoom'] = (roomId, patch) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
    }));
    notifyToast('success', 'Room details updated.');
  };

  const deleteRoom: HostelContextValue['deleteRoom'] = (roomId) => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (countOccupiedBeds(room) > 0) {
      notifyToast('error', `Cannot delete Room ${room.roomNumber}: beds are currently occupied.`);
      return { ok: false, error: 'Cannot delete a room with active occupants.' };
    }
    setState((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== roomId) }));
    notifyToast('success', `Room ${room.roomNumber} removed.`);
    return { ok: true };
  };

  const assignOrTransferBed: HostelContextValue['assignOrTransferBed'] = (
    studentId,
    roomId,
    bedId,
    isTransfer
  ) => {
    const check = validateBedAllocation(
      state.rooms,
      state.students,
      studentId,
      roomId,
      bedId,
      isTransfer
    );
    if (!check.ok) {
      notifyToast('error', check.error);
      return { ok: false, error: check.error };
    }
    setState((prev) => {
      const res = applyBedAllocation(
        prev.rooms,
        prev.students,
        studentId,
        roomId,
        bedId,
        currentUser?.name || 'Owner'
      );
      return { ...prev, rooms: res.rooms, students: res.students };
    });
    notifyToast(
      'success',
      isTransfer ? 'Tenant transferred to new bed.' : 'Bed allocated successfully.'
    );
    return { ok: true };
  };

  const vacateBedOnly = (roomId: string, bedId: string) => {
    const room = state.rooms.find((r) => r.id === roomId);
    const bed = room?.beds.find((b) => b.id === bedId);
    if (!bed?.occupantStudentId) return;
    const stu = state.students.find((s) => s.id === bed.occupantStudentId);
    vacateStudent(
      bed.occupantStudentId,
      new Date().toISOString().slice(0, 10),
      stu?.securityDeposit || 0
    );
  };

  const generateMonthlyRent = (billingMonth: string) => {
    let createdCount = 0;
    const dueDay = String(state.settings.rentDueDay).padStart(2, '0');
    const dueDate = `${billingMonth}-${dueDay}`;
    const newEntries: RentLedgerEntry[] = [];

    state.students
      .filter((s) => s.status === 'active')
      .forEach((student) => {
        const exists = state.rentLedger.some(
          (l) => l.studentId === student.id && l.billingMonth === billingMonth
        );
        if (!exists) {
          createdCount += 1;
          newEntries.push({
            id: `led-${Date.now()}-${student.id}`,
            studentId: student.id,
            billingMonth,
            dueDate,
            rentAmount: student.monthlyRent,
            paidAmount: 0,
            advanceApplied: 0,
            balanceAmount: student.monthlyRent,
            status: 'pending',
          });
        }
      });

    if (createdCount > 0) {
      setState((prev) => ({ ...prev, rentLedger: [...newEntries, ...prev.rentLedger] }));
      notifyToast('success', `Generated rent ledger for ${createdCount} active tenants.`);
    } else {
      notifyToast('info', `Rent bills already exist for all active tenants in ${billingMonth}.`);
    }
    return createdCount;
  };

  const recordPayment: HostelContextValue['recordPayment'] = (params) => {
    const result = applyRentPayment(state.rentLedger, state.payments, state.students, {
      ...params,
      recordedBy: currentUser?.name || 'Owner',
    });
    setState((prev) => ({
      ...prev,
      rentLedger: result.ledger,
      payments: result.transactions,
      students: result.students,
    }));
    notifyToast('success', `Payment ${result.receipt.receiptNo} recorded.`);
    return result.receipt;
  };

  const addExpense = (exp: Omit<Expense, 'id'>) => {
    setState((prev) => ({
      ...prev,
      expenses: [{ ...exp, id: `exp-${Date.now()}` }, ...prev.expenses],
    }));
    notifyToast('success', 'Expense entry added.');
  };

  const updateExpense = (id: string, patch: Partial<Expense>) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    notifyToast('success', 'Expense updated.');
  };

  const deleteExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    notifyToast('info', 'Expense removed.');
  };

  const addElectricityBill: HostelContextValue['addElectricityBill'] = (payload) => {
    const { unitsConsumed, totalBill } = calculateElectricityBill(
      payload.previousReading,
      payload.currentReading,
      payload.ratePerUnit,
      payload.fixedCharges
    );
    const bill: ElectricityBill = {
      id: `el-${Date.now()}`,
      billingMonth: payload.billingMonth,
      meterScope: payload.meterScope,
      roomId: payload.roomId || null,
      previousReading: payload.previousReading,
      currentReading: payload.currentReading,
      unitsConsumed,
      ratePerUnit: payload.ratePerUnit,
      fixedCharges: payload.fixedCharges,
      totalBill,
      status: payload.status,
      dueDate: payload.dueDate,
      paidDate: payload.status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
    };
    setState((prev) => ({
      ...prev,
      electricityBills: [bill, ...prev.electricityBills],
    }));
    notifyToast('success', `Electricity bill (${unitsConsumed} kWh) saved.`);
  };

  const toggleElectricityBillStatus = (billId: string) => {
    setState((prev) => ({
      ...prev,
      electricityBills: prev.electricityBills.map((b) =>
        b.id === billId
          ? {
              ...b,
              status: b.status === 'paid' ? 'pending' : 'paid',
              paidDate: b.status === 'pending' ? new Date().toISOString().slice(0, 10) : undefined,
            }
          : b
      ),
    }));
    notifyToast('success', 'Electricity bill payment status updated.');
  };

  const deleteElectricityBill = (billId: string) => {
    setState((prev) => ({
      ...prev,
      electricityBills: prev.electricityBills.filter((b) => b.id !== billId),
    }));
    notifyToast('info', 'Electricity bill deleted.');
  };

  const addDocument: HostelContextValue['addDocument'] = (doc) => {
    const newDoc: StudentDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedOn: new Date().toISOString().slice(0, 10),
      status: 'pending',
    };
    setState((prev) => ({ ...prev, documents: [newDoc, ...prev.documents] }));
    notifyToast('success', 'Document uploaded and queued for verification.');
  };

  const updateDocumentStatus = (docId: string, status: VerificationStatus, remarks?: string) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              status,
              remarks: remarks !== undefined ? remarks : d.remarks,
              verifiedBy: currentUser?.name || 'Owner',
            }
          : d
      ),
    }));
    notifyToast('success', `Document marked as ${status}.`);
  };

  const deleteDocument = (docId: string) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
    notifyToast('info', 'Document removed.');
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    notifyToast('info', 'All notifications marked as read.');
  };

  const dismissNotification = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  const updateSettings = (patch: Partial<HostelSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    notifyToast('success', 'Settings saved to local demo workspace.');
  };

  const addStaffMember = (member: Omit<AuthUser, 'id'>) => {
    setState((prev) => ({
      ...prev,
      staff: [...prev.staff, { ...member, id: `usr-${Date.now()}` }],
    }));
    notifyToast('success', `Staff account created for ${member.name}.`);
  };

  const toggleStaffStatus = (id: string) => {
    setState((prev) => ({
      ...prev,
      staff: prev.staff.map((u) => (u.id === id ? { ...u, active: !u.active } : u)),
    }));
    notifyToast('info', 'Staff account status updated.');
  };

  const resetDemoData = () => {
    const fresh = hostelRepository.resetState();
    setState(fresh);
    notifyToast('info', 'Demo data restored to default Indian PG dataset.');
  };

  return (
    <HostelContext.Provider
      value={{
        ...state,
        currentUser,
        activeModule,
        selectedStudentId,
        quickAction,
        toasts,
        setActiveModule,
        openStudentProfile,
        triggerQuickAction,
        consumeQuickAction,
        login,
        logout,
        switchUserRole,
        notifyToast,
        dismissToast,
        addStudent,
        updateStudent,
        vacateStudent,
        addBuilding,
        addRoom,
        updateRoom,
        deleteRoom,
        assignOrTransferBed,
        vacateBedOnly,
        generateMonthlyRent,
        recordPayment,
        addExpense,
        updateExpense,
        deleteExpense,
        addElectricityBill,
        toggleElectricityBillStatus,
        deleteElectricityBill,
        addDocument,
        updateDocumentStatus,
        deleteDocument,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        updateSettings,
        addStaffMember,
        toggleStaffStatus,
        resetDemoData,
      }}
    >
      {children}
    </HostelContext.Provider>
  );
};

export function useHostel() {
  const ctx = useContext(HostelContext);
  if (!ctx) throw new Error('useHostel must be used inside HostelProvider');
  return ctx;
}
