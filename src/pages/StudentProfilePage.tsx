import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  BedDouble,
  FileText,
  History,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserMinus,
} from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { formatINR, formatIndianDate, formatMonthLabel, getInitials } from '../utils/formatters';
import {
  Button,
  Card,
  ConfirmDialog,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatusLabel,
} from '../components/ui/Primitives';

export const StudentProfilePage: React.FC = () => {
  const {
    students,
    selectedStudentId,
    rooms,
    buildings,
    rentLedger,
    payments,
    documents,
    setActiveModule,
    triggerQuickAction,
    assignOrTransferBed,
    vacateStudent,
  } = useHostel();

  const student = students.find((s) => s.id === selectedStudentId) || students[0];
  const [tab, setTab] = useState<'overview' | 'payments' | 'documents' | 'activity'>('overview');
  const [transferOpen, setTransferOpen] = useState(false);
  const [vacateConfirmOpen, setVacateConfirmOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');

  if (!student) return null;

  const building = buildings.find((b) => b.id === student.buildingId);
  const room = rooms.find((r) => r.id === student.roomId);
  const bed = room?.beds.find((b) => b.id === student.bedId);

  const studentLedger = rentLedger.filter((l) => l.studentId === student.id);
  const studentPayments = payments.filter((p) => p.studentId === student.id);
  const studentDocs = documents.filter((d) => d.studentId === student.id);
  const totalDues = studentLedger.reduce((sum, l) => sum + l.balanceAmount, 0);
  const depositHeld = Math.max(0, student.securityDeposit - student.depositRefundedAmount);

  const selectedRoomObj = rooms.find((r) => r.id === targetRoomId);
  const vacantBeds = selectedRoomObj?.beds.filter((b) => b.status === 'vacant') || [];

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoomId || !targetBedId) return;
    const res = assignOrTransferBed(
      student.id,
      targetRoomId,
      targetBedId,
      Boolean(student.bedId)
    );
    if (res.ok) {
      setTransferOpen(false);
      setTargetRoomId('');
      setTargetBedId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button size="sm" variant="ghost" onClick={() => setActiveModule('students')}>
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Button>
      </div>

      <PageHeader
        breadcrumb={`Tenant Profile · ${student.studentCode}`}
        title={student.fullName}
        subtitle={`${student.organization || 'Resident'} · Joined ${formatIndianDate(student.joiningDate)}`}
        actions={
          student.status === 'active' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="h-4 w-4" />{' '}
                {student.bedId ? 'Transfer Room' : 'Assign Bed'}
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={() => triggerQuickAction('rent', 'record-payment')}
              >
                <IndianRupee className="h-4 w-4" /> Record Payment
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setVacateConfirmOpen(true)}
              >
                <UserMinus className="h-4 w-4" /> Vacate
              </Button>
            </>
          )
        }
      />

      {/* Profile Header Summary */}
      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 font-display text-xl font-bold text-white">
                {getInitials(student.fullName)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {student.fullName}
                </h2>
                <StatusLabel tone={student.status === 'active' ? 'emerald' : 'slate'}>
                  {student.status}
                </StatusLabel>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {student.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {student.email || '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> {student.idProofType}:{' '}
                  <span className="font-mono">{student.idProofNumber || 'Pending'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="text-xs text-slate-500">Monthly Rent</p>
              <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                {formatINR(student.monthlyRent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Outstanding Dues</p>
              <p
                className={`mt-1 font-mono text-base font-bold tabular-nums ${
                  totalDues > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatINR(totalDues)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Deposit Held</p>
              <p className="mt-1 font-mono text-base font-bold text-indigo-700 tabular-nums">
                {formatINR(depositHeld)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Section Tabs */}
      <SegmentedControl
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { value: 'overview', label: 'Personal & Room' },
          { value: 'payments', label: `Payments & Dues (${studentPayments.length})` },
          { value: 'documents', label: `KYC Documents (${studentDocs.length})` },
          { value: 'activity', label: `Activity History (${student.activityHistory.length})` },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Personal &amp; Guardian Information
            </h3>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Gender &amp; Date of Birth</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {student.gender} · {formatIndianDate(student.dob)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">College / Employer</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{student.organization || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Parent / Guardian</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{student.parentName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Parent Phone</dt>
                <dd className="mt-0.5 font-mono text-xs font-medium text-slate-900">
                  {student.parentPhone || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Emergency Contact</dt>
                <dd className="mt-0.5 font-mono text-xs font-medium text-slate-900">
                  {student.emergencyContact || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ID Reference</dt>
                <dd className="mt-0.5 font-mono text-xs font-medium text-slate-900">
                  {student.idProofType} ({student.idProofNumber || '—'})
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Permanent Address</dt>
                <dd className="mt-1 flex items-start gap-1.5 text-slate-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{student.permanentAddress || 'Not provided'}</span>
                </dd>
              </div>
              {student.notes && (
                <div className="border-t border-slate-100 pt-3 sm:col-span-2">
                  <dt className="text-xs text-slate-500">Warden Notes</dt>
                  <dd className="mt-1 text-sm text-slate-700">{student.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="space-y-5">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Room &amp; Bed Allocation
              </h3>
              {room && bed ? (
                <div className="mt-3 flex items-center justify-between border-y border-slate-100 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {building?.name} · Room {room.roomNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        Floor {room.floor} · {room.type} Sharing · Bed {bed.label}
                      </p>
                    </div>
                  </div>
                  <StatusLabel tone="indigo">Occupied</StatusLabel>
                </div>
              ) : (
                <p className="mt-3 border-y border-slate-100 py-4 text-sm text-slate-500">
                  {student.status === 'vacated'
                    ? `Vacated on ${formatIndianDate(student.vacatedDate)}. Bed released.`
                    : 'No active bed assigned yet.'}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Security Deposit Details
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Tracked as refundable liability, separate from monthly rent revenue.
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Total Collected</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(student.securityDeposit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Refunded</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(student.depositRefundedAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Status</dt>
                  <dd className="mt-0.5">
                    <StatusLabel
                      tone={student.depositStatus === 'held' ? 'indigo' : 'emerald'}
                    >
                      {student.depositStatus.replace('_', ' ')}
                    </StatusLabel>
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding={false}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Monthly Rent Ledger
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {studentLedger.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatMonthLabel(l.billingMonth)}
                    </p>
                    <p className="text-xs text-slate-500">Due {formatIndianDate(l.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(l.paidAmount)}{' '}
                      <span className="font-normal text-slate-400">
                        / {formatINR(l.rentAmount)}
                      </span>
                    </p>
                    <StatusLabel
                      subtle
                      tone={
                        l.status === 'paid' || l.status === 'advance'
                          ? 'emerald'
                          : l.status === 'overdue'
                          ? 'rose'
                          : 'amber'
                      }
                    >
                      {l.status}
                      {l.balanceAmount > 0 ? ` · Bal ${formatINR(l.balanceAmount)}` : ''}
                    </StatusLabel>
                  </div>
                </div>
              ))}
              {studentLedger.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-slate-500">
                  No rent bills generated yet.
                </p>
              )}
            </div>
          </Card>

          <Card padding={false}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Payment History &amp; Receipts
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {studentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <div>
                    <p className="font-mono font-medium text-slate-900">{p.receiptNo}</p>
                    <p className="text-xs text-slate-500">
                      {p.method} · {formatIndianDate(p.paidOn)} · {p.referenceNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-emerald-700 tabular-nums">
                      +{formatINR(p.amount)}
                    </p>
                    <p className="text-[11px] capitalize text-slate-400">{p.type}</p>
                  </div>
                </div>
              ))}
              {studentPayments.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-slate-500">
                  No payments recorded yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Identity &amp; KYC Documents
            </h3>
            <Button size="sm" variant="secondary" onClick={() => setActiveModule('documents')}>
              Open KYC Vault
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {studentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {doc.docType} · {doc.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ref <span className="font-mono">{doc.referenceNo}</span> · Uploaded{' '}
                      {formatIndianDate(doc.uploadedOn)}
                    </p>
                  </div>
                </div>
                <StatusLabel
                  tone={
                    doc.status === 'verified'
                      ? 'emerald'
                      : doc.status === 'pending'
                      ? 'amber'
                      : 'rose'
                  }
                >
                  {doc.status}
                </StatusLabel>
              </div>
            ))}
            {studentDocs.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-slate-500">
                No documents uploaded for this tenant yet.
              </p>
            )}
          </div>
        </Card>
      )}

      {tab === 'activity' && (
        <Card padding={false}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Activity &amp; Audit Timeline
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {student.activityHistory.map((act) => (
              <div key={act.id} className="flex items-start gap-3 px-5 py-3.5">
                <History className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{act.action}</p>
                  <p className="text-xs text-slate-600">{act.detail}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatIndianDate(act.timestamp)} · Recorded by {act.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Room Transfer / Bed Allocation Modal */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title={student.bedId ? 'Transfer Tenant to Another Bed' : 'Assign Bed'}
        subtitle="Enforces 1 student = 1 active bed. Previous bed will be released automatically."
        size="md"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <Select
            label="Target Room"
            value={targetRoomId}
            onChange={(e) => {
              setTargetRoomId(e.target.value);
              setTargetBedId('');
            }}
            required
          >
            <option value="">Choose room with vacant beds</option>
            {rooms.map((r) => {
              const vac = r.beds.filter((b) => b.status === 'vacant').length;
              return (
                <option key={r.id} value={r.id} disabled={vac === 0}>
                  Room {r.roomNumber} (Floor {r.floor} · {r.type}) — {vac} vacant
                </option>
              );
            })}
          </Select>

          <Select
            label="Target Bed"
            value={targetBedId}
            onChange={(e) => setTargetBedId(e.target.value)}
            disabled={!targetRoomId}
            required
          >
            <option value="">Select vacant bed</option>
            {vacantBeds.map((b) => (
              <option key={b.id} value={b.id}>
                Bed {b.label}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Confirm Allocation</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={vacateConfirmOpen}
        onClose={() => setVacateConfirmOpen(false)}
        onConfirm={() =>
          vacateStudent(
            student.id,
            new Date().toISOString().slice(0, 10),
            student.securityDeposit
          )
        }
        title={`Vacate ${student.fullName}?`}
        message={`This marks ${student.fullName} as vacated, immediately releases their bed, and records a full deposit refund of ${formatINR(
          student.securityDeposit
        )}.`}
        confirmLabel="Confirm Vacate"
      />
    </div>
  );
};
