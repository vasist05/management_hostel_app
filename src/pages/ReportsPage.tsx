import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { HISTORICAL_FINANCIALS } from '../data/mockData';
import { calculateSeparateDepositHeld, countOccupiedBeds } from '../logic/businessRules';
import { useHostel } from '../services/hostelStore';
import {
  downloadCSV,
  formatINR,
  formatIndianDate,
  formatMonthLabel,
} from '../utils/formatters';
import { Button, Card, PageHeader, SegmentedControl, StatusLabel } from '../components/ui/Primitives';

type ReportTab =
  | 'occupancy'
  | 'students'
  | 'rent_collection'
  | 'pending_rent'
  | 'expenses'
  | 'electricity'
  | 'income_vs_expense'
  | 'deposits';

export const ReportsPage: React.FC = () => {
  const {
    buildings,
    rooms,
    students,
    rentLedger,
    expenses,
    electricityBills,
    notifyToast,
  } = useHostel();

  const [report, setReport] = useState<ReportTab>('occupancy');
  const [fromDate, setFromDate] = useState('2026-06-01');
  const [toDate, setToDate] = useState('2026-12-31');

  const getStudent = (id: string) => students.find((s) => s.id === id);
  const getBuildingName = (id: string) =>
    buildings.find((b) => b.id === id)?.name || '—';

  const reportData = useMemo(() => {
    switch (report) {
      case 'occupancy': {
        const headers = ['Building', 'Room', 'Floor', 'Type', 'Capacity', 'Occupied', 'Vacant', 'Occupancy %'];
        const rows = rooms.map((r) => {
          const occ = countOccupiedBeds(r);
          const vac = r.capacity - occ;
          const pct = Math.round((occ / r.capacity) * 100);
          return [
            getBuildingName(r.buildingId),
            `Room ${r.roomNumber}`,
            r.floor,
            r.type,
            r.capacity,
            occ,
            vac,
            `${pct}%`,
          ];
        });
        return { title: 'Occupancy Report', headers, rows };
      }

      case 'students': {
        const headers = ['Code', 'Name', 'Phone', 'Organization', 'Joining Date', 'Monthly Rent (₹)', 'Status'];
        const rows = students
          .filter((s) => s.joiningDate >= fromDate && s.joiningDate <= toDate)
          .map((s) => [
            s.studentCode,
            s.fullName,
            s.phone,
            s.organization,
            formatIndianDate(s.joiningDate),
            s.monthlyRent,
            s.status,
          ]);
        return { title: 'Student Directory Report', headers, rows };
      }

      case 'rent_collection': {
        const headers = ['Student', 'Month', 'Rent Expected (₹)', 'Collected (₹)', 'Balance (₹)', 'Status'];
        const rows = rentLedger.map((l) => [
          getStudent(l.studentId)?.fullName || 'Unknown',
          formatMonthLabel(l.billingMonth),
          l.rentAmount,
          l.paidAmount + l.advanceApplied,
          l.balanceAmount,
          l.status,
        ]);
        return { title: 'Monthly Rent Collection Report', headers, rows };
      }

      case 'pending_rent': {
        const headers = ['Student', 'Phone', 'Month', 'Due Date', 'Balance Due (₹)', 'Status'];
        const rows = rentLedger
          .filter((l) => l.balanceAmount > 0)
          .map((l) => {
            const stu = getStudent(l.studentId);
            return [
              stu?.fullName || 'Unknown',
              stu?.phone || '—',
              formatMonthLabel(l.billingMonth),
              formatIndianDate(l.dueDate),
              l.balanceAmount,
              l.status,
            ];
          });
        return { title: 'Pending & Overdue Rent Report', headers, rows };
      }

      case 'expenses': {
        const headers = ['Date', 'Category', 'Vendor', 'Description', 'Method', 'Amount (₹)'];
        const rows = expenses
          .filter((e) => e.date >= fromDate && e.date <= toDate)
          .map((e) => [
            formatIndianDate(e.date),
            e.category,
            e.vendorName || '—',
            e.description,
            e.paymentMethod,
            e.amount,
          ]);
        return { title: 'Expense Report', headers, rows };
      }

      case 'electricity': {
        const headers = ['Month', 'Meter Scope', 'Prev', 'Curr', 'Units (kWh)', 'Total Bill (₹)', 'Status'];
        const rows = electricityBills.map((b) => [
          formatMonthLabel(b.billingMonth),
          b.meterScope,
          b.previousReading,
          b.currentReading,
          b.unitsConsumed,
          b.totalBill,
          b.status,
        ]);
        return { title: 'Electricity Consumption Report', headers, rows };
      }

      case 'income_vs_expense': {
        const novRev = rentLedger
          .filter((l) => l.billingMonth === '2026-11')
          .reduce((s, l) => s + l.paidAmount + l.advanceApplied, 0);
        const novExp = expenses
          .filter((e) => e.date.startsWith('2026-11'))
          .reduce((s, e) => s + e.amount, 0);
        const combined = [
          ...HISTORICAL_FINANCIALS.map((h) => ({
            month: h.month,
            revenue: h.revenue,
            expense: h.expense,
          })),
          { month: 'Nov 26', revenue: novRev, expense: novExp },
        ];
        const headers = ['Month', 'Rent Collected (₹)', 'Total Expenses (₹)', 'Net Income (₹)', 'Margin %'];
        const rows = combined.map((c) => {
          const net = c.revenue - c.expense;
          const margin = c.revenue > 0 ? `${Math.round((net / c.revenue) * 100)}%` : '0%';
          return [c.month, c.revenue, c.expense, net, margin];
        });
        return { title: 'Monthly Income vs Expense Report', headers, rows };
      }

      case 'deposits': {
        const headers = [
          'Student',
          'Status',
          'Deposit Collected (₹)',
          'Refunded (₹)',
          'Net Held Liability (₹)',
          'Deposit Status',
        ];
        const rows = students.map((s) => [
          s.fullName,
          s.status,
          s.securityDeposit,
          s.depositRefundedAmount,
          Math.max(0, s.securityDeposit - s.depositRefundedAmount),
          s.depositStatus.replace('_', ' '),
        ]);
        return { title: 'Security Deposit Liability Report', headers, rows };
      }
    }
  }, [report, rooms, students, rentLedger, expenses, electricityBills, buildings, fromDate, toDate]);

  const handleExportCSV = () => {
    downloadCSV(
      `hostel-manager-${report}-report.csv`,
      reportData.headers,
      reportData.rows
    );
    notifyToast('success', `Exported ${reportData.title} as CSV.`);
  };

  const totalDepositsHeld = calculateSeparateDepositHeld(students);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Analytics & Export"
        title="Reports & Financial Statements"
        subtitle="Filterable operational and accounting reports with CSV export and printable PDF view."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
            <Button size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </>
        }
      />

      {/* Report Selector + Date Range */}
      <Card className="no-print space-y-4 p-4">
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            value={report}
            onChange={(v) => setReport(v as ReportTab)}
            options={[
              { value: 'occupancy', label: 'Occupancy' },
              { value: 'students', label: 'Students' },
              { value: 'rent_collection', label: 'Rent Collection' },
              { value: 'pending_rent', label: 'Pending Rent' },
              { value: 'expenses', label: 'Expenses' },
              { value: 'electricity', label: 'Electricity' },
              { value: 'income_vs_expense', label: 'Income vs Expense' },
              { value: 'deposits', label: 'Security Deposits' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-slate-600">
              <span>From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              <span>To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </label>
          </div>
          {report === 'deposits' && (
            <span className="font-mono font-semibold text-indigo-700 tabular-nums">
              Total Refundable Deposit Liability Held: {formatINR(totalDepositsHeld)}
            </span>
          )}
        </div>
      </Card>

      {/* Report Table Output */}
      <Card padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {reportData.title}
            </h2>
            <p className="text-xs text-slate-500">
              {reportData.rows.length} records · Generated {formatIndianDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
          <StatusLabel tone="indigo">INR (₹)</StatusLabel>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
              <tr>
                {reportData.headers.map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  {row.map((cell, cIdx) => {
                    const header = reportData.headers[cIdx] || '';
                    const isCurrency = header.includes('₹');
                    return (
                      <td
                        key={cIdx}
                        className={`whitespace-nowrap px-5 py-3 text-xs ${
                          isCurrency
                            ? 'font-mono font-semibold text-slate-900 tabular-nums'
                            : cIdx === 0
                            ? 'font-medium text-slate-900'
                            : 'text-slate-600'
                        }`}
                      >
                        {isCurrency && typeof cell === 'number' ? formatINR(cell) : String(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {reportData.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={reportData.headers.length}
                    className="px-5 py-10 text-center text-xs text-slate-500"
                  >
                    No records match the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
