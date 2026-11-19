import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { calculateSeparateDepositHeld } from '../logic/businessRules';
import { useHostel } from '../services/hostelStore';
import {
  PaymentMethod,
  PaymentTransaction,
  RentLedgerEntry,
  RentStatus,
} from '../types/hostel';
import { formatINR, formatIndianDate, formatMonthLabel } from '../utils/formatters';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatCard,
  StatusLabel,
} from '../components/ui/Primitives';

export const RentPaymentsPage: React.FC = () => {
  const {
    students,
    rooms,
    rentLedger,
    payments,
    settings,
    quickAction,
    consumeQuickAction,
    generateMonthlyRent,
    recordPayment,
    openStudentProfile,
  } = useHostel();

  const [tab, setTab] = useState<'ledger' | 'history'>('ledger');
  const [monthFilter, setMonthFilter] = useState('2026-11');
  const [statusFilter, setStatusFilter] = useState<'all' | RentStatus>('all');
  const [search, setSearch] = useState('');

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModal, setReceiptModal] = useState<PaymentTransaction | null>(null);

  const [payForm, setPayForm] = useState({
    studentId: '',
    ledgerId: null as string | null,
    billingMonth: '2026-11',
    amount: 0,
    type: 'rent' as 'rent' | 'advance' | 'deposit',
    method: 'UPI' as PaymentMethod,
    referenceNo: '',
    paidOn: '2026-11-19',
    notes: '',
  });

  useEffect(() => {
    if (quickAction === 'record-payment') {
      openQuickPay();
      consumeQuickAction();
    }
  }, [quickAction]);

  const getStudent = (id: string) => students.find((s) => s.id === id);
  const getRoomNo = (roomId: string | null) =>
    rooms.find((r) => r.id === roomId)?.roomNumber || '—';

  const availableMonths = useMemo(() => {
    const set = new Set<string>(['2026-11', '2026-12']);
    rentLedger.forEach((l) => set.add(l.billingMonth));
    return Array.from(set).sort().reverse();
  }, [rentLedger]);

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rentLedger.filter((entry) => {
      if (monthFilter !== 'all' && entry.billingMonth !== monthFilter) return false;
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (!q) return true;
      const stu = getStudent(entry.studentId);
      return (
        stu?.fullName.toLowerCase().includes(q) ||
        stu?.studentCode.toLowerCase().includes(q) ||
        getRoomNo(stu?.roomId || null).toLowerCase().includes(q)
      );
    });
  }, [rentLedger, monthFilter, statusFilter, search, students, rooms]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (monthFilter !== 'all' && p.billingMonth !== monthFilter) return false;
      if (!q) return true;
      const stu = getStudent(p.studentId);
      return (
        stu?.fullName.toLowerCase().includes(q) ||
        p.receiptNo.toLowerCase().includes(q) ||
        p.referenceNo.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q)
      );
    });
  }, [payments, monthFilter, search, students]);

  const monthStats = useMemo(() => {
    const rows = rentLedger.filter((l) => monthFilter === 'all' || l.billingMonth === monthFilter);
    const expected = rows.reduce((s, r) => s + r.rentAmount, 0);
    const collected = rows.reduce((s, r) => s + r.paidAmount + r.advanceApplied, 0);
    const pending = rows.reduce((s, r) => s + r.balanceAmount, 0);
    const overdue = rows
      .filter((r) => r.status === 'overdue')
      .reduce((s, r) => s + r.balanceAmount, 0);
    return { expected, collected, pending, overdue };
  }, [rentLedger, monthFilter]);

  const depositsHeld = calculateSeparateDepositHeld(students);

  const openQuickPay = (entry?: RentLedgerEntry) => {
    if (entry) {
      setPayForm({
        studentId: entry.studentId,
        ledgerId: entry.id,
        billingMonth: entry.billingMonth,
        amount: entry.balanceAmount,
        type: 'rent',
        method: 'UPI',
        referenceNo: '',
        paidOn: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } else {
      const firstActive = students.find((s) => s.status === 'active');
      setPayForm({
        studentId: firstActive?.id || '',
        ledgerId: null,
        billingMonth: monthFilter === 'all' ? '2026-11' : monthFilter,
        amount: firstActive?.monthlyRent || 0,
        type: 'rent',
        method: 'UPI',
        referenceNo: '',
        paidOn: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    }
    setPayModalOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.studentId || Number(payForm.amount) <= 0) return;

    let matchedLedgerId = payForm.ledgerId;
    if (!matchedLedgerId && payForm.type === 'rent') {
      const found = rentLedger.find(
        (l) => l.studentId === payForm.studentId && l.billingMonth === payForm.billingMonth
      );
      matchedLedgerId = found?.id || null;
    }

    const receipt = recordPayment({
      ...payForm,
      ledgerId: matchedLedgerId,
      amount: Number(payForm.amount),
    });
    setPayModalOpen(false);
    setReceiptModal(receipt);
  };

  const statusTone = (status: RentStatus) =>
    status === 'paid' || status === 'advance'
      ? 'emerald'
      : status === 'partial'
      ? 'amber'
      : status === 'overdue'
      ? 'rose'
      : 'slate';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Billing & Collections"
        title="Rent & Payment Management"
        subtitle="Track monthly rent, partial payments, advances, receipts, and separate security deposits."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => generateMonthlyRent('2026-12')}
            >
              <RefreshCw className="h-4 w-4" /> Generate Dec Rent
            </Button>
            <Button size="sm" onClick={() => openQuickPay()}>
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          </>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Rent Expected"
          value={formatINR(monthStats.expected)}
          hint={monthFilter === 'all' ? 'All cycles' : formatMonthLabel(monthFilter)}
          icon={<IndianRupee className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label="Rent Collected"
          value={formatINR(monthStats.collected)}
          hint={`${
            monthStats.expected > 0
              ? Math.round((monthStats.collected / monthStats.expected) * 100)
              : 0
          }% realization`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Pending Balance"
          value={formatINR(monthStats.pending)}
          hint="Unpaid + partial dues"
          icon={<AlertCircle className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Overdue Amount"
          value={formatINR(monthStats.overdue)}
          hint="Past due date"
          icon={<AlertCircle className="h-4 w-4" />}
          tone="rose"
        />
        <StatCard
          label="Deposits Held"
          value={formatINR(depositsHeld)}
          hint="Separate from rent income"
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      {/* Tabs & Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={tab}
              onChange={(v) => setTab(v as typeof tab)}
              options={[
                { value: 'ledger', label: `Rent Ledger (${filteredLedger.length})` },
                { value: 'history', label: `Payment Receipts (${filteredPayments.length})` },
              ]}
            />

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter billing month"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            {tab === 'ledger' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                aria-label="Filter rent status"
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="advance">Advance</option>
              </select>
            )}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, room, receipt..."
              className="min-h-[40px] w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      {tab === 'ledger' && (
        <Card padding={false} className="overflow-hidden">
          {filteredLedger.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<IndianRupee className="h-6 w-6" />}
                title="No rent bills found"
                description="Generate rent for the selected billing cycle or adjust your filters."
                action={
                  <Button onClick={() => generateMonthlyRent('2026-12')}>
                    Generate Monthly Rent
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-4 py-3.5">Month / Due Date</th>
                    <th className="px-4 py-3.5 text-right">Rent</th>
                    <th className="px-4 py-3.5 text-right">Paid</th>
                    <th className="px-4 py-3.5 text-right">Balance</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.map((entry) => {
                    const stu = getStudent(entry.studentId);
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => openStudentProfile(entry.studentId)}
                            className="font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {stu?.fullName || 'Unknown'}
                          </button>
                          <p className="text-xs text-slate-500">
                            Room {getRoomNo(stu?.roomId || null)} · {stu?.studentCode}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {formatMonthLabel(entry.billingMonth)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due {formatIndianDate(entry.dueDate)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-900 tabular-nums">
                          {formatINR(entry.rentAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-emerald-700 tabular-nums">
                          {formatINR(entry.paidAmount + entry.advanceApplied)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums">
                          <span
                            className={
                              entry.balanceAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                            }
                          >
                            {formatINR(entry.balanceAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusLabel tone={statusTone(entry.status)}>{entry.status}</StatusLabel>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {entry.balanceAmount > 0 ? (
                            <Button size="sm" onClick={() => openQuickPay(entry)}>
                              Collect Rent
                            </Button>
                          ) : (
                            <span className="text-xs font-medium text-emerald-700">Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Payment History Table */}
      {tab === 'history' && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Receipt No</th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Type &amp; Month</th>
                  <th className="px-4 py-3.5">Method &amp; Ref</th>
                  <th className="px-4 py-3.5">Paid On</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((pay) => {
                  const stu = getStudent(pay.studentId);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-indigo-700">
                        {pay.receiptNo}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {stu?.fullName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <span className="capitalize font-medium text-slate-800">{pay.type}</span> ·{' '}
                        {formatMonthLabel(pay.billingMonth)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-slate-800">{pay.method}</p>
                        <p className="font-mono text-[11px] text-slate-500">{pay.referenceNo}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {formatIndianDate(pay.paidOn)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {formatINR(pay.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setReceiptModal(pay)}
                        >
                          <Printer className="h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Record Rent / Deposit Payment"
        subtitle="Supports full, partial, advance rent, and separate security deposit entries."
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Select
            label="Student *"
            value={payForm.studentId}
            onChange={(e) => {
              const s = students.find((st) => st.id === e.target.value);
              const existingLedger = rentLedger.find(
                (l) => l.studentId === e.target.value && l.billingMonth === payForm.billingMonth
              );
              setPayForm({
                ...payForm,
                studentId: e.target.value,
                ledgerId: existingLedger?.id || null,
                amount: existingLedger?.balanceAmount || s?.monthlyRent || 0,
              });
            }}
            required
          >
            <option value="">Select tenant...</option>
            {students
              .filter((s) => s.status === 'active')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentCode})
                </option>
              ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Category"
              value={payForm.type}
              onChange={(e) =>
                setPayForm({ ...payForm, type: e.target.value as 'rent' | 'advance' | 'deposit' })
              }
            >
              <option value="rent">Monthly Rent (Full / Partial)</option>
              <option value="advance">Advance Rent</option>
              <option value="deposit">Security Deposit (Separate)</option>
            </Select>
            <Input
              label="Billing Month"
              type="month"
              value={payForm.billingMonth}
              onChange={(e) => setPayForm({ ...payForm, billingMonth: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount Received (₹) *"
              type="number"
              min={1}
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
              required
            />
            <Select
              label="Payment Method"
              value={payForm.method}
              onChange={(e) =>
                setPayForm({ ...payForm, method: e.target.value as PaymentMethod })
              }
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transaction / UTR Ref"
              placeholder="UPI Ref / Cash Receipt #"
              value={payForm.referenceNo}
              onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
            />
            <Input
              label="Payment Date"
              type="date"
              value={payForm.paidOn}
              onChange={(e) => setPayForm({ ...payForm, paidOn: e.target.value })}
            />
          </div>

          <Input
            label="Notes"
            placeholder="Partial balance note or remarks"
            value={payForm.notes}
            onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Confirm &amp; Generate Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Printable Payment Receipt Modal */}
      <Modal
        open={Boolean(receiptModal)}
        onClose={() => setReceiptModal(null)}
        title="Payment Receipt"
        subtitle={receiptModal?.receiptNo}
        size="md"
      >
        {receiptModal && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 p-5 text-sm">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="font-display text-base font-bold text-slate-900">
                    {settings.hostelName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {settings.address}, {settings.city} {settings.pincode}
                  </p>
                  <p className="text-xs text-slate-500">
                    GSTIN: <span className="font-mono">{settings.gstNumber}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-indigo-700">
                    {receiptModal.receiptNo}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatIndianDate(receiptModal.paidOn)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Received From</dt>
                  <dd className="font-semibold text-slate-900">
                    {getStudent(receiptModal.studentId)?.fullName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Payment Towards</dt>
                  <dd className="font-medium capitalize text-slate-900">
                    {receiptModal.type} · {formatMonthLabel(receiptModal.billingMonth)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Payment Mode</dt>
                  <dd className="font-medium text-slate-900">{receiptModal.method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Reference Number</dt>
                  <dd className="font-mono text-slate-800">{receiptModal.referenceNo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Recorded By</dt>
                  <dd className="text-slate-800">{receiptModal.recordedBy}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-700">Total Amount Paid</span>
                <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
                  {formatINR(receiptModal.amount)}
                </span>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                {settings.receiptFooter}
              </p>
            </div>

            <div className="no-print flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReceiptModal(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
