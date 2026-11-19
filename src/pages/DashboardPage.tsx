import React from 'react';
import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock,
  IndianRupee,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { HISTORICAL_FINANCIALS } from '../data/mockData';
import { calculateSeparateDepositHeld, countOccupiedBeds } from '../logic/businessRules';
import { useHostel } from '../services/hostelStore';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { OccupancyTrendChart, RevenueExpenseChart } from '../components/charts/Charts';
import { Button, Card, PageHeader, StatCard, StatusLabel } from '../components/ui/Primitives';

export const DashboardPage: React.FC = () => {
  const {
    students,
    rooms,
    buildings,
    rentLedger,
    payments,
    expenses,
    setActiveModule,
    triggerQuickAction,
    openStudentProfile,
  } = useHostel();

  const currentMonth = '2026-11';
  const activeStudents = students.filter((s) => s.status === 'active');
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((sum, r) => sum + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + countOccupiedBeds(r), 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const monthLedger = rentLedger.filter((l) => l.billingMonth === currentMonth);
  const rentExpected = monthLedger.reduce((sum, l) => sum + l.rentAmount, 0);
  const rentCollected = monthLedger.reduce((sum, l) => sum + l.paidAmount + l.advanceApplied, 0);
  const rentPending = monthLedger.reduce((sum, l) => sum + l.balanceAmount, 0);

  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);
  const netMonthlyIncome = rentCollected - monthExpenses;
  const totalDepositsHeld = calculateSeparateDepositHeld(students);

  const occupancySeries = [
    ...HISTORICAL_FINANCIALS.map((h) => ({ month: h.month, occupancy: h.occupancy })),
    { month: 'Nov 26', occupancy: occupancyPct },
  ];

  const revExpSeries = [
    ...HISTORICAL_FINANCIALS.map((h) => ({
      month: h.month,
      revenue: h.revenue,
      expense: h.expense,
    })),
    { month: 'Nov 26', revenue: rentCollected, expense: monthExpenses },
  ];

  const upcomingOrOverdueDues = monthLedger
    .filter((l) => l.balanceAmount > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const recentPayments = payments.slice(0, 5);
  const recentRegistrations = [...students]
    .sort((a, b) => b.joiningDate.localeCompare(a.joiningDate))
    .slice(0, 5);

  const getStudentName = (id: string) =>
    students.find((s) => s.id === id)?.fullName || 'Unknown Tenant';
  const getRoomLabel = (roomId: string | null) => {
    const r = rooms.find((rm) => rm.id === roomId);
    return r ? `Room ${r.roomNumber}` : 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Overview · November 2026"
        title="Operations Dashboard"
        subtitle="Occupancy, monthly rent collections, expenses, and upcoming tenant dues."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => triggerQuickAction('rooms', 'add-room')}
            >
              <Building2 className="h-4 w-4" /> Add Room
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => triggerQuickAction('expenses', 'add-expense')}
            >
              <Receipt className="h-4 w-4" /> Add Expense
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
              onClick={() => triggerQuickAction('students', 'add-student')}
            >
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
          </>
        }
      />

      {/* Row 1: Capacity & Occupancy Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Active Students"
          value={activeStudents.length}
          hint={`${students.filter((s) => s.status === 'vacated').length} vacated`}
          icon={<Users className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label="Total Rooms"
          value={totalRooms}
          hint={`${buildings.length} buildings`}
          icon={<Building2 className="h-4 w-4" />}
          tone="slate"
        />
        <StatCard
          label="Total Beds"
          value={totalBeds}
          hint="Licensed capacity"
          icon={<BedDouble className="h-4 w-4" />}
          tone="slate"
        />
        <StatCard
          label="Occupied Beds"
          value={occupiedBeds}
          hint="Active allocations"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Vacant Beds"
          value={vacantBeds}
          hint="Ready for check-in"
          icon={<BedDouble className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${occupancyPct}%`}
          hint={`${occupiedBeds}/${totalBeds} beds filled`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="indigo"
        />
      </div>

      {/* Row 2: Financial Metrics (Security Deposits isolated from income) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Monthly Rent Expected"
          value={formatINR(rentExpected)}
          hint={`${monthLedger.length} active bills`}
          icon={<IndianRupee className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label="Rent Collected"
          value={formatINR(rentCollected)}
          hint={`${rentExpected > 0 ? Math.round((rentCollected / rentExpected) * 100) : 0}% collected`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Pending Rent"
          value={formatINR(rentPending)}
          hint={`${upcomingOrOverdueDues.length} dues open`}
          icon={<AlertCircle className="h-4 w-4" />}
          tone="rose"
        />
        <StatCard
          label="Monthly Expenses"
          value={formatINR(monthExpenses)}
          hint="Operations & utilities"
          icon={<Receipt className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Net Monthly Income"
          value={formatINR(netMonthlyIncome)}
          hint={`Deposits held: ${formatINR(totalDepositsHeld)}`}
          icon={<Wallet className="h-4 w-4" />}
          tone={netMonthlyIncome >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Occupancy Trend
              </h2>
              <p className="text-xs text-slate-500">6-month bed utilization percentage</p>
            </div>
            <span className="font-mono text-sm font-semibold text-indigo-700 tabular-nums">
              {occupancyPct}% now
            </span>
          </div>
          <OccupancyTrendChart data={occupancySeries} />
        </Card>

        <Card>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Monthly Revenue vs Expense
              </h2>
              <p className="text-xs text-slate-500">
                Rent collections vs operating costs (excludes deposits)
              </p>
            </div>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                netMonthlyIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              Net {formatINR(netMonthlyIncome)}
            </span>
          </div>
          <RevenueExpenseChart data={revExpSeries} />
        </Card>
      </div>

      {/* Operational Lists (Single-elevation dividers, no nested cards) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming & Overdue Dues */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Upcoming &amp; Overdue Dues
            </h2>
            <button
              type="button"
              onClick={() => setActiveModule('rent')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View Ledger
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingOrOverdueDues.map((entry) => (
              <div
                key={entry.id}
                onClick={() => openStudentProfile(entry.studentId)}
                className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {getStudentName(entry.studentId)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" /> Due {formatIndianDate(entry.dueDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {formatINR(entry.balanceAmount)}
                  </p>
                  <StatusLabel
                    subtle
                    tone={
                      entry.status === 'overdue'
                        ? 'rose'
                        : entry.status === 'partial'
                        ? 'amber'
                        : 'slate'
                    }
                  >
                    {entry.status}
                  </StatusLabel>
                </div>
              </div>
            ))}
            {upcomingOrOverdueDues.length === 0 && (
              <p className="px-5 py-8 text-center text-xs text-slate-500">
                All November rent dues are settled.
              </p>
            )}
          </div>
        </Card>

        {/* Recent Payments */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">Recent Payments</h2>
            <button
              type="button"
              onClick={() => setActiveModule('rent')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              All Receipts
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPayments.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {getStudentName(pay.studentId)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {pay.method} · {formatIndianDate(pay.paidOn)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                    +{formatINR(pay.amount)}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">{pay.receiptNo}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Registrations */}
        <Card padding={false}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Recent Registrations
            </h2>
            <button
              type="button"
              onClick={() => setActiveModule('students')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Directory
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentRegistrations.map((stu) => (
              <div
                key={stu.id}
                onClick={() => openStudentProfile(stu.id)}
                className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{stu.fullName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {getRoomLabel(stu.roomId)} · {stu.organization}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusLabel subtle tone={stu.status === 'active' ? 'emerald' : 'slate'}>
                    {stu.status}
                  </StatusLabel>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatIndianDate(stu.joiningDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
