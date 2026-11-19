import {
  Bed,
  PaymentMethod,
  PaymentTransaction,
  RentLedgerEntry,
  Room,
  Student,
} from '../types/hostel';

/**
 * Domain rules enforced across all UI flows:
 * 1. One student can occupy only one active bed at a time.
 * 2. One bed can have only one active student at a time.
 * 3. Room capacity must never be exceeded.
 * 4. Vacating a student immediately releases their bed.
 * 5. Payment transactions preserve an immutable ledger history.
 * 6. Partial payments recalculate outstanding balance accurately.
 * 7. Security deposits are tracked separately from monthly rent income.
 */

export function countOccupiedBeds(room: Room): number {
  return room.beds.filter((b) => b.status === 'occupied' && b.occupantStudentId !== null).length;
}

export function validateBedAllocation(
  rooms: Room[],
  students: Student[],
  studentId: string,
  targetRoomId: string,
  targetBedId: string,
  allowTransferFromCurrent = false
): { ok: true } | { ok: false; error: string } {
  const student = students.find((s) => s.id === studentId);
  if (!student) return { ok: false, error: 'Student record not found.' };
  if (student.status === 'vacated') {
    return {
      ok: false,
      error: 'Vacated tenants cannot be assigned a bed. Re-activate the tenant first.',
    };
  }
  if (student.bedId && !allowTransferFromCurrent) {
    return {
      ok: false,
      error: 'Tenant already occupies an active bed. Use Room Transfer to move them.',
    };
  }

  const room = rooms.find((r) => r.id === targetRoomId);
  if (!room) return { ok: false, error: 'Target room not found.' };

  const bed = room.beds.find((b) => b.id === targetBedId);
  if (!bed) return { ok: false, error: 'Target bed not found.' };

  if (bed.status === 'occupied' || bed.occupantStudentId !== null) {
    return { ok: false, error: `Bed ${bed.label} in Room ${room.roomNumber} is already occupied.` };
  }

  const occupiedInRoom = countOccupiedBeds(room);
  const isSameRoomTransfer = student.roomId === targetRoomId;
  if (!isSameRoomTransfer && occupiedInRoom >= room.capacity) {
    return {
      ok: false,
      error: `Room ${room.roomNumber} has reached maximum capacity (${room.capacity} beds).`,
    };
  }

  return { ok: true };
}

export function applyBedAllocation(
  rooms: Room[],
  students: Student[],
  studentId: string,
  targetRoomId: string,
  targetBedId: string,
  actorName: string
): { rooms: Room[]; students: Student[] } {
  const targetRoom = rooms.find((r) => r.id === targetRoomId)!;
  const targetBed = targetRoom.beds.find((b) => b.id === targetBedId)!;
  const student = students.find((s) => s.id === studentId)!;
  const previousBedId = student.bedId;

  const updatedRooms = rooms.map((room) => ({
    ...room,
    beds: room.beds.map((bed): Bed => {
      if ((previousBedId && bed.id === previousBedId) || bed.occupantStudentId === studentId) {
        return { ...bed, status: 'vacant', occupantStudentId: null };
      }
      if (bed.id === targetBedId) {
        return { ...bed, status: 'occupied', occupantStudentId: studentId };
      }
      return bed;
    }),
  }));

  const actionLabel = previousBedId ? 'Room Transferred' : 'Bed Allocated';
  const detailLabel = `Assigned to Room ${targetRoom.roomNumber}, Bed ${targetBed.label}`;

  const updatedStudents = students.map((s) =>
    s.id === studentId
      ? {
          ...s,
          buildingId: targetRoom.buildingId,
          floor: targetRoom.floor,
          roomId: targetRoom.id,
          bedId: targetBed.id,
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString().slice(0, 10),
              action: actionLabel,
              detail: detailLabel,
              actor: actorName,
            },
            ...s.activityHistory,
          ],
        }
      : s
  );

  return { rooms: updatedRooms, students: updatedStudents };
}

export function applyVacateStudent(
  rooms: Room[],
  students: Student[],
  studentId: string,
  vacatedDate: string,
  depositRefundedAmount: number,
  actorName: string
): { rooms: Room[]; students: Student[] } {
  const student = students.find((s) => s.id === studentId);
  if (!student) return { rooms, students };

  const safeRefund = Math.max(0, Math.min(student.securityDeposit, depositRefundedAmount));

  const updatedRooms = rooms.map((room) => ({
    ...room,
    beds: room.beds.map((bed): Bed =>
      bed.id === student.bedId || bed.occupantStudentId === studentId
        ? { ...bed, status: 'vacant', occupantStudentId: null }
        : bed
    ),
  }));

  const depositStatus: Student['depositStatus'] =
    safeRefund >= student.securityDeposit
      ? 'refunded'
      : safeRefund > 0
      ? 'partially_refunded'
      : 'held';

  const updatedStudents = students.map((s) =>
    s.id === studentId
      ? {
          ...s,
          status: 'vacated' as const,
          vacatedDate,
          buildingId: null,
          floor: null,
          roomId: null,
          bedId: null,
          depositStatus,
          depositRefundedAmount: safeRefund,
          activityHistory: [
            {
              id: `act-${Date.now()}`,
              timestamp: vacatedDate,
              action: 'Tenant Vacated',
              detail: `Released bed and settled deposit (₹${safeRefund.toLocaleString('en-IN')} refunded)`,
              actor: actorName,
            },
            ...s.activityHistory,
          ],
        }
      : s
  );

  return { rooms: updatedRooms, students: updatedStudents };
}

export function applyRentPayment(
  ledger: RentLedgerEntry[],
  transactions: PaymentTransaction[],
  students: Student[],
  params: {
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
): {
  ledger: RentLedgerEntry[];
  transactions: PaymentTransaction[];
  students: Student[];
  receipt: PaymentTransaction;
} {
  const receipt: PaymentTransaction = {
    id: `pay-${Date.now()}`,
    receiptNo: `RCP-2026-${String(transactions.length + 101).padStart(4, '0')}`,
    studentId: params.studentId,
    ledgerId: params.ledgerId,
    billingMonth: params.billingMonth,
    amount: params.amount,
    type: params.type,
    method: params.method,
    referenceNo: params.referenceNo.trim() || 'COUNTER-RECEIPT',
    paidOn: params.paidOn,
    notes: params.notes,
    recordedBy: params.recordedBy,
  };

  let updatedLedger = ledger;
  let updatedStudents = students;

  if (params.type === 'deposit') {
    // Security deposits are strictly separated from rent ledger / monthly rent revenue
    updatedStudents = students.map((s) =>
      s.id === params.studentId
        ? {
            ...s,
            securityDeposit: s.securityDeposit + params.amount,
            depositStatus: 'held',
            activityHistory: [
              {
                id: `act-${Date.now()}`,
                timestamp: params.paidOn,
                action: 'Security Deposit Received',
                detail: `Received ₹${params.amount.toLocaleString('en-IN')} via ${params.method} (${receipt.receiptNo})`,
                actor: params.recordedBy,
              },
              ...s.activityHistory,
            ],
          }
        : s
    );
  } else if (params.ledgerId) {
    updatedLedger = ledger.map((entry) => {
      if (entry.id !== params.ledgerId) return entry;
      const newPaid = entry.paidAmount + params.amount;
      const newBalance = Math.max(0, entry.rentAmount - newPaid - entry.advanceApplied);
      const status =
        newBalance === 0
          ? params.type === 'advance'
            ? 'advance'
            : 'paid'
          : newPaid > 0
          ? 'partial'
          : entry.status;
      return {
        ...entry,
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status,
      };
    });

    updatedStudents = students.map((s) =>
      s.id === params.studentId
        ? {
            ...s,
            activityHistory: [
              {
                id: `act-${Date.now()}`,
                timestamp: params.paidOn,
                action: params.type === 'advance' ? 'Advance Rent Paid' : 'Rent Payment Recorded',
                detail: `Paid ₹${params.amount.toLocaleString('en-IN')} via ${params.method} (${receipt.receiptNo})`,
                actor: params.recordedBy,
              },
              ...s.activityHistory,
            ],
          }
        : s
    );
  } else if (params.type === 'advance') {
    const newEntry: RentLedgerEntry = {
      id: `led-${Date.now()}`,
      studentId: params.studentId,
      billingMonth: params.billingMonth,
      dueDate: `${params.billingMonth}-05`,
      rentAmount: params.amount,
      paidAmount: params.amount,
      advanceApplied: 0,
      balanceAmount: 0,
      status: 'advance',
    };
    updatedLedger = [newEntry, ...ledger];
  }

  return {
    ledger: updatedLedger,
    transactions: [receipt, ...transactions],
    students: updatedStudents,
    receipt,
  };
}

export function calculateElectricityBill(
  previousReading: number,
  currentReading: number,
  ratePerUnit: number,
  fixedCharges: number
): { unitsConsumed: number; totalBill: number } {
  const unitsConsumed = Math.max(0, currentReading - previousReading);
  const energyCharge = unitsConsumed * ratePerUnit;
  const totalBill = Math.round(energyCharge + fixedCharges);
  return { unitsConsumed, totalBill };
}

export function calculateSeparateDepositHeld(students: Student[]): number {
  return students.reduce((sum, s) => {
    const netHeld = Math.max(0, s.securityDeposit - s.depositRefundedAmount);
    return sum + netHeld;
  }, 0);
}
