import React, { useEffect, useMemo, useState } from 'react';
import {
  Edit3,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useHostel } from '../services/hostelStore';
import { Expense, ExpenseCategory, PaymentMethod } from '../types/hostel';
import { formatINR, formatIndianDate } from '../utils/formatters';
import { HorizontalBarBreakdown } from '../components/charts/Charts';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
} from '../components/ui/Primitives';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Electricity',
  'Water',
  'Internet',
  'Food',
  'Maintenance',
  'Cleaning',
  'Staff Salary',
  'Repairs',
  'Other',
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: 'bg-indigo-600',
  'Staff Salary': 'bg-slate-800',
  Electricity: 'bg-amber-500',
  Water: 'bg-sky-500',
  Internet: 'bg-indigo-400',
  Maintenance: 'bg-emerald-600',
  Cleaning: 'bg-teal-500',
  Repairs: 'bg-rose-500',
  Other: 'bg-slate-400',
};

export const ExpensesPage: React.FC = () => {
  const {
    expenses,
    quickAction,
    consumeQuickAction,
    addExpense,
    updateExpense,
    deleteExpense,
    notifyToast,
  } = useHostel();

  const [monthFilter, setMonthFilter] = useState('2026-11');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const emptyForm = {
    category: 'Food' as ExpenseCategory,
    date: '2026-11-19',
    amount: 0,
    paymentMethod: 'UPI' as PaymentMethod,
    vendorName: '',
    description: '',
    attachmentName: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (quickAction === 'add-expense') {
      setEditing(null);
      setForm(emptyForm);
      setModalOpen(true);
      consumeQuickAction();
    }
  }, [quickAction]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (monthFilter !== 'all' && !e.date.startsWith(monthFilter)) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.vendorName || '').toLowerCase().includes(q)
      );
    });
  }, [expenses, monthFilter, categoryFilter, search]);

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  const breakdown = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    filtered.forEach((e) => {
      totals.set(e.category, (totals.get(e.category) || 0) + e.amount);
    });
    return Array.from(totals.entries())
      .map(([cat, value]) => ({
        label: cat,
        value,
        color: CATEGORY_COLORS[cat],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const topCategory = breakdown[0];

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      category: exp.category,
      date: exp.date,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      vendorName: exp.vendorName || '',
      description: exp.description,
      attachmentName: exp.attachmentName || '',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(form.amount) <= 0 || !form.description.trim()) {
      notifyToast('error', 'Enter a valid amount and expense description.');
      return;
    }
    const payload = {
      ...form,
      amount: Number(form.amount),
      description: form.description.trim(),
      vendorName: form.vendorName.trim(),
      attachmentName: form.attachmentName.trim() || undefined,
    };
    if (editing) {
      updateExpense(editing.id, payload);
    } else {
      addExpense(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb="Operations Spend"
        title="Expense Management"
        subtitle="Track hostel utilities, staff payroll, kitchen provisions, repairs, and bill attachments."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Expenses (Filtered)"
          value={formatINR(totalFiltered)}
          hint={`${filtered.length} recorded vouchers`}
          icon={<Receipt className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Top Spend Category"
          value={topCategory ? topCategory.label : '—'}
          hint={topCategory ? formatINR(topCategory.value) : 'No entries'}
          icon={<Receipt className="h-4 w-4" />}
          tone="indigo"
        />
        <StatCard
          label="Bills With Attachments"
          value={filtered.filter((e) => Boolean(e.attachmentName)).length}
          hint={`of ${filtered.length} total expenses`}
          icon={<Paperclip className="h-4 w-4" />}
          tone="emerald"
        />
      </div>

      {/* Category Breakdown + Expense History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Category Breakdown
          </h2>
          <p className="mb-4 text-xs text-slate-500">Share of total spend by category</p>
          {breakdown.length > 0 ? (
            <HorizontalBarBreakdown items={breakdown} />
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No expense data in filter.</p>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, vendor, category..."
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                aria-label="Filter month"
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
              >
                <option value="all">All Months</option>
                <option value="2026-11">Nov 2026</option>
                <option value="2026-10">Oct 2026</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
                aria-label="Filter category"
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card padding={false} className="overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Receipt className="h-6 w-6" />}
                  title="No expenses found"
                  description="Add a new expense or broaden your month/category filters."
                  action={<Button onClick={openAdd}>Add Expense</Button>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Date &amp; Category</th>
                      <th className="px-4 py-3.5">Description &amp; Vendor</th>
                      <th className="px-4 py-3.5">Mode</th>
                      <th className="px-4 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{exp.category}</p>
                          <p className="text-xs text-slate-500">{formatIndianDate(exp.date)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-slate-900">{exp.description}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {exp.vendorName && <span>{exp.vendorName}</span>}
                            {exp.attachmentName && (
                              <span className="inline-flex items-center gap-1 text-indigo-600">
                                <Paperclip className="h-3 w-3" /> {exp.attachmentName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{exp.paymentMethod}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatINR(exp.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(exp)}
                              title="Edit Expense"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(exp)}
                              title="Delete Expense"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
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
            )}
          </Card>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Expense Entry' : 'Record New Expense'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Expense Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹) *"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              required
            />
            <Select
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })
              }
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <Input
            label="Vendor / Payee"
            placeholder="BESCOM, Sri Lakshmi Provisions, Payroll..."
            value={form.vendorName}
            onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
          />

          <Input
            label="Description *"
            placeholder="Brief details of the purchase or bill"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Optional Bill Attachment
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> Attach Bill File
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setForm({ ...form, attachmentName: f.name });
                  }}
                />
              </label>
              <span className="truncate text-xs text-slate-500">
                {form.attachmentName || 'No file attached'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Update Expense' : 'Save Expense'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteExpense(deleteTarget.id);
        }}
        title="Delete Expense Entry?"
        message={`Remove ${deleteTarget?.category} expense of ${formatINR(
          deleteTarget?.amount || 0
        )}? This updates your monthly net income calculation.`}
        confirmLabel="Delete Expense"
      />
    </div>
  );
};
