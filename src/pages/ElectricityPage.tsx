import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2, Zap } from 'lucide-react';
import { calculateElectricityBill } from '../logic/businessRules';
import { useHostel } from '../services/hostelStore';
import { ElectricityBill } from '../types/hostel';
import { formatINR, formatIndianDate, formatMonthLabel } from '../utils/formatters';
import { ElectricityConsumptionChart } from '../components/charts/Charts';
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  StatCard,
  StatusLabel,
} from '../components/ui/Primitives';

export const ElectricityPage: React.FC = () => {
  const {
    electricityBills,
    rooms,
    addElectricityBill,
    toggleElectricityBillStatus,
    deleteElectricityBill,
    notifyToast,
  } = useHostel();

  const [scopeFilter, setScopeFilter] = useState<'all' | 'main' | 'room'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ElectricityBill | null>(null);

  const [form, setForm] = useState({
    billingMonth: '2026-11',
    meterType: 'main' as 'main' | 'room',
    roomId: rooms[0]?.id || '',
    meterScope: 'Block A & B Main Meter',
    previousReading: 26395,
    currentReading: 28010,
    ratePerUnit: 8.5,
    fixedCharges: 950,
    dueDate: '2026-12-10',
    status: 'pending' as 'paid' | 'pending',
  });

  const previewCalc = calculateElectricityBill(
    Number(form.previousReading),
    Number(form.currentReading),
    Number(form.ratePerUnit),
    Number(form.fixedCharges)
  );

  const filteredBills = useMemo(() => {
    return electricityBills.filter((b) => {
      if (scopeFilter === 'main' && b.roomId) return false;
      if (scopeFilter === 'room' && !b.roomId) return false;
      return true;
    });
  }, [electricityBills, scopeFilter]);

  const mainMeterSeries = useMemo(() => {
    return [...electricityBills]
      .filter((b) => !b.roomId)
      .sort((a, b) => a.billingMonth.localeCompare(b.billingMonth))
      .map((b) => ({
        label: formatMonthLabel(b.billingMonth),
        units: b.unitsConsumed,
        amount: b.totalBill,
      }));
  }, [electricityBills]);

  const totalUnits = filteredBills.reduce((s, b) => s + b.unitsConsumed, 0);
  const pendingTotal = filteredBills
    .filter((b) => b.status === 'pending')
    .reduce((s, b) => s + b.totalBill, 0);
  const avgRate =
    filteredBills.length > 0
      ? (
          filteredBills.reduce((s, b) => s + b.ratePerUnit, 0) / filteredBills.length
        ).toFixed(2)
      : '0';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(form.currentReading) < Number(form.previousReading)) {
      notifyToast('error', 'Current meter reading cannot be less than previous reading.');
      return;
    }
    const selectedRoom = rooms.find((r) => r.id === form.roomId);
    const scopeLabel =
      form.meterType === 'room' && selectedRoom
        ? `Room ${selectedRoom.roomNumber} Sub-Meter`
        : form.meterScope.trim() || 'Main Property Meter';

    addElectricityBill({
      billingMonth: form.billingMonth,
      meterScope: scopeLabel,
      roomId: form.meterType === 'room' ? form.roomId : null,
      previousReading: Number(form.previousReading),
      currentReading: Number(form.currentReading),
      ratePerUnit: Number(form.ratePerUnit),
      fixedCharges: Number(form.fixedCharges),
      dueDate: form.dueDate,
      status: form.status,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Utilities & Sub-Meters"
        title="Electricity Management"
        subtitle="Record main BESCOM/EB and room sub-meter readings, compute unit charges, and track payments."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Electricity Bill
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Units Tracked"
          value={`${totalUnits.toLocaleString('en-IN')} kWh`}
          hint={`${filteredBills.length} billing cycles`}
          icon={<Zap className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label="Unpaid Electricity Bills"
          value={formatINR(pendingTotal)}
          hint={`${filteredBills.filter((b) => b.status === 'pending').length} bills pending`}
          icon={<Zap className="h-4 w-4" />}
          tone={pendingTotal > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          label="Average Tariff Rate"
          value={`₹${avgRate} / unit`}
          hint="Commercial + AC sub-meter"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      {/* Monthly Consumption Chart */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Monthly Electricity Consumption
            </h2>
            <p className="text-xs text-slate-500">Main property meter kWh consumption trend</p>
          </div>
          <SegmentedControl
            value={scopeFilter}
            onChange={(v) => setScopeFilter(v as typeof scopeFilter)}
            options={[
              { value: 'all', label: 'All Meters' },
              { value: 'main', label: 'Main Meter' },
              { value: 'room', label: 'Room Sub-Meters' },
            ]}
          />
        </div>
        <ElectricityConsumptionChart data={mainMeterSeries} />
      </Card>

      {/* Bill History Table */}
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Month &amp; Meter</th>
                <th className="px-4 py-3.5 text-right">Prev / Curr</th>
                <th className="px-4 py-3.5 text-right">Units (kWh)</th>
                <th className="px-4 py-3.5 text-right">Rate &amp; Fixed</th>
                <th className="px-4 py-3.5 text-right">Total Bill</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900">
                      {formatMonthLabel(bill.billingMonth)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {bill.meterScope} · Due {formatIndianDate(bill.dueDate)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {bill.previousReading.toLocaleString('en-IN')} →{' '}
                    {bill.currentReading.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                    {bill.unitsConsumed.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                    ₹{bill.ratePerUnit}/u + {formatINR(bill.fixedCharges)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(bill.totalBill)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusLabel tone={bill.status === 'paid' ? 'emerald' : 'amber'}>
                      {bill.status}
                    </StatusLabel>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={bill.status === 'pending' ? 'success' : 'secondary'}
                        onClick={() => toggleElectricityBillStatus(bill.id)}
                      >
                        {bill.status === 'pending' ? 'Mark Paid' : 'Mark Pending'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(bill)}
                        title="Delete Bill"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Electricity Bill Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Enter Electricity Meter Reading"
        subtitle="Units consumed and total bill calculate automatically."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Billing Month"
              type="month"
              value={form.billingMonth}
              onChange={(e) => setForm({ ...form, billingMonth: e.target.value })}
              required
            />
            <Select
              label="Meter Scope"
              value={form.meterType}
              onChange={(e) => setForm({ ...form, meterType: e.target.value as 'main' | 'room' })}
            >
              <option value="main">Main Property Meter</option>
              <option value="room">Room-Level Sub-Meter</option>
            </Select>
          </div>

          {form.meterType === 'room' ? (
            <Select
              label="Room Sub-Meter"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} (Floor {r.floor})
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Meter Label"
              value={form.meterScope}
              onChange={(e) => setForm({ ...form, meterScope: e.target.value })}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Previous Reading (kWh)"
              type="number"
              min={0}
              value={form.previousReading}
              onChange={(e) => setForm({ ...form, previousReading: Number(e.target.value) })}
              required
            />
            <Input
              label="Current Reading (kWh)"
              type="number"
              min={0}
              value={form.currentReading}
              onChange={(e) => setForm({ ...form, currentReading: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate per Unit (₹)"
              type="number"
              step="0.1"
              min={0}
              value={form.ratePerUnit}
              onChange={(e) => setForm({ ...form, ratePerUnit: Number(e.target.value) })}
              required
            />
            <Input
              label="Fixed / Demand Charges (₹)"
              type="number"
              min={0}
              value={form.fixedCharges}
              onChange={(e) => setForm({ ...form, fixedCharges: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
            <Select
              label="Payment Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'paid' | 'pending' })}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </Select>
          </div>

          {/* Live Calculation Summary */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-xs">
            <div>
              <p className="text-slate-500">Units Consumed</p>
              <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
                {previewCalc.unitsConsumed} kWh
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Estimated Total Bill</p>
              <p className="font-mono text-base font-bold text-indigo-700 tabular-nums">
                {formatINR(previewCalc.totalBill)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Bill</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteElectricityBill(deleteTarget.id);
        }}
        title="Delete Electricity Bill?"
        message={`Delete the ${deleteTarget?.meterScope} bill (${formatINR(
          deleteTarget?.totalBill || 0
        )})?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
